/**
 * Account maintenance, run from the CLI with the deployment's admin key.
 * Internal functions can't be called from the app. For example:
 *
 *   npx convex run --prod admin:mergeAccounts \
 *     '{"keepUsername": "paprika", "mergeUsername": "baston2rue", "dryRun": true}'
 *
 * Either account can be given by user ID instead, for one that hasn't picked
 * a username yet.
 */
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { resolveCollectionOwnerKey } from './discogsCollection';
import { isLegacyFlagSet } from './lib/playlistSharing';
import { getPlaylistsForUser } from './playlists';

async function findUser(ctx: MutationCtx, usernameOrId: string) {
  const userId = ctx.db.normalizeId('users', usernameOrId);
  const user = userId
    ? await ctx.db.get(userId)
    : await ctx.db
        .query('users')
        .withIndex('by_username', (q) =>
          q.eq('username', usernameOrId.toLowerCase()),
        )
        .first();
  if (!user) throw new Error(`No user named ${usernameOrId}`);
  return user;
}

async function playlistTracksOf(ctx: MutationCtx, playlistId: Id<'playlists'>) {
  return await ctx.db
    .query('playlist_tracks')
    .withIndex('by_playlist_position', (q) => q.eq('playlist_id', playlistId))
    .collect();
}

/** The Favorites playlist addFavorite writes to (owner is email or ID). */
async function favoritesOf(ctx: MutationCtx, user: Doc<'users'>) {
  return (await getPlaylistsForUser(ctx, user)).find(
    (playlist) =>
      isLegacyFlagSet(playlist.is_favorites) &&
      (playlist.user_id === user.email || playlist.user_id === user._id),
  );
}

/** Collection rows stored under any of a user's owner keys. */
async function releaseRowsOf(ctx: MutationCtx, user: Doc<'users'>) {
  const keys = [user._id, user.email, user.supabaseUserId].filter(
    (key): key is string => Boolean(key),
  );
  const rows = await Promise.all(
    keys.map((key) =>
      ctx.db
        .query('user_releases')
        .withIndex('by_user', (q) => q.eq('user_id', key))
        .collect(),
    ),
  );
  return rows.flat();
}

/**
 * Fold one account into another when they're the same person, for example
 * an account migrated from Supabase and the one Discogs sign-in created.
 *
 * `merge` loses everything to `keep`: its sign-in methods (so Discogs sign-in
 * opens `keep`), its Discogs connection, playlists, favorites and collection.
 * Its sessions end, so the next sign-in lands in `keep`, and the `merge` user
 * is deleted. `keep` keeps its username. dryRun reports without writing.
 */
export const mergeAccounts = internalMutation({
  args: {
    keepUsername: v.string(),
    mergeUsername: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { keepUsername, mergeUsername, dryRun = false }) => {
    const keep = await findUser(ctx, keepUsername);
    const merge = await findUser(ctx, mergeUsername);
    if (keep._id === merge._id) throw new Error('Pick two different accounts');

    // Sign-in methods. Two identities with the same provider is a real
    // conflict (two Discogs users), so stop rather than guess.
    const accounts = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', merge._id))
      .collect();
    for (const account of accounts) {
      const clash = await ctx.db
        .query('authAccounts')
        .withIndex('userIdAndProvider', (q) =>
          q.eq('userId', keep._id).eq('provider', account.provider),
        )
        .first();
      if (clash) {
        throw new Error(`Both accounts sign in with ${account.provider}`);
      }
    }

    const connections = await ctx.db
      .query('user_music_connections')
      .withIndex('by_user', (q) => q.eq('userId', merge._id))
      .collect();
    for (const connection of connections) {
      const clash = await ctx.db
        .query('user_music_connections')
        .withIndex('by_user_provider', (q) =>
          q.eq('userId', keep._id).eq('provider', connection.provider),
        )
        .first();
      if (clash) {
        throw new Error(`Both accounts connect ${connection.provider}`);
      }
    }

    const mergePlaylists = await getPlaylistsForUser(ctx, merge);
    const regular = mergePlaylists.filter(
      (playlist) => !isLegacyFlagSet(playlist.is_favorites),
    );
    const mergeFavorites = mergePlaylists.filter((playlist) =>
      isLegacyFlagSet(playlist.is_favorites),
    );
    const keepFavorites = await favoritesOf(ctx, keep);
    const alreadyFavorite = new Set(
      keepFavorites
        ? (await playlistTracksOf(ctx, keepFavorites._id)).map(
            (playlistTrack) => playlistTrack.track_id,
          )
        : [],
    );
    const favoriteTrackIds: Id<'tracks'>[] = [];
    for (const playlist of mergeFavorites) {
      for (const playlistTrack of await playlistTracksOf(ctx, playlist._id)) {
        if (!alreadyFavorite.has(playlistTrack.track_id)) {
          alreadyFavorite.add(playlistTrack.track_id);
          favoriteTrackIds.push(playlistTrack.track_id);
        }
      }
    }

    const collectionKey = await resolveCollectionOwnerKey(ctx, keep);
    const keptReleases = new Set(
      (await releaseRowsOf(ctx, keep)).map((row) =>
        String(row.discogs_release_id),
      ),
    );
    const mergeReleaseRows = await releaseRowsOf(ctx, merge);
    const newReleases = [
      ...new Set(
        mergeReleaseRows
          .map((row) => String(row.discogs_release_id))
          .filter((releaseId) => !keptReleases.has(releaseId)),
      ),
    ];

    const sessions = await ctx.db
      .query('authSessions')
      .withIndex('userId', (q) => q.eq('userId', merge._id))
      .collect();

    const report = {
      dryRun,
      keep: keep.username ?? keep._id,
      merge: merge.username ?? merge._id,
      signInMethods: accounts.map((account) => account.provider),
      connections: connections.map((connection) => connection.provider),
      playlistsMoved: regular.map((playlist) => playlist.title),
      favoritesAdded: favoriteTrackIds.length,
      releasesAdded: newReleases.length,
      releaseRowsRemoved: mergeReleaseRows.length,
      sessionsEnded: sessions.length,
    };
    if (dryRun) return report;

    const now = new Date().toISOString();
    const owner = keep.email ?? keep._id;

    for (const account of accounts) {
      await ctx.db.patch(account._id, { userId: keep._id });
    }
    for (const connection of connections) {
      await ctx.db.patch(connection._id, { userId: keep._id });
    }

    for (const playlist of regular) {
      await ctx.db.patch(playlist._id, { user_id: owner, updated_at: now });
    }
    if (favoriteTrackIds.length > 0) {
      const favoritesId =
        keepFavorites?._id ??
        (await ctx.db.insert('playlists', {
          id: crypto.randomUUID(),
          user_id: owner,
          title: 'Favorites',
          description: 'Your favorite tracks',
          visibility: 'private',
          is_favorites: true,
          created_at: now,
          updated_at: now,
        }));
      const existing = await playlistTracksOf(ctx, favoritesId);
      let position =
        existing.reduce((max, row) => Math.max(max, row.position), -1) + 1;
      for (const trackId of favoriteTrackIds) {
        await ctx.db.insert('playlist_tracks', {
          id: crypto.randomUUID(),
          playlist_id: favoritesId,
          track_id: trackId,
          position: position++,
          created_at: now,
        });
      }
    }
    for (const playlist of mergeFavorites) {
      for (const playlistTrack of await playlistTracksOf(ctx, playlist._id)) {
        await ctx.db.delete(playlistTrack._id);
      }
      await ctx.db.delete(playlist._id);
    }

    for (const releaseId of newReleases) {
      await ctx.db.insert('user_releases', {
        user_id: collectionKey,
        discogs_release_id: releaseId,
      });
    }
    for (const row of mergeReleaseRows) {
      await ctx.db.delete(row._id);
    }

    const discogsProfiles = await ctx.db
      .query('user_discogs_profile')
      .withIndex('by_user', (q) => q.eq('user_id', merge._id))
      .collect();
    for (const profile of discogsProfiles) {
      await ctx.db.delete(profile._id);
    }
    const oauthRequests = await ctx.db
      .query('discogs_oauth_requests')
      .withIndex('by_user', (q) => q.eq('userId', merge._id))
      .collect();
    for (const request of oauthRequests) {
      await ctx.db.delete(request._id);
    }

    const sessionIds = new Set<Id<'authSessions'>>(
      sessions.map((session) => session._id),
    );
    for (const session of sessions) {
      const tokens = await ctx.db
        .query('authRefreshTokens')
        .withIndex('sessionId', (q) => q.eq('sessionId', session._id))
        .collect();
      for (const token of tokens) await ctx.db.delete(token._id);
    }
    // authVerifiers has no sessionId index; it only holds in-flight sign-ins.
    for (const verifier of await ctx.db.query('authVerifiers').collect()) {
      if (verifier.sessionId && sessionIds.has(verifier.sessionId)) {
        await ctx.db.delete(verifier._id);
      }
    }
    for (const session of sessions) await ctx.db.delete(session._id);

    if (!keep.avatarUrl && merge.avatarUrl) {
      await ctx.db.patch(keep._id, { avatarUrl: merge.avatarUrl });
    }
    await ctx.db.delete(merge._id);

    return report;
  },
});
