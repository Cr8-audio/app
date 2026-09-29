/**
 * Account maintenance, run from the CLI with the deployment's admin key.
 * Internal functions can't be called from the app. For example:
 *
 *   npx convex run --prod admin:transferPlaylists \
 *     '{"fromUsername": "paprika", "toUsername": "baston2rue", "dryRun": true}'
 */
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { isLegacyFlagSet, playlistVisibility } from './lib/playlistSharing';
import { getPlaylistsForUser } from './playlists';

async function userByUsername(ctx: MutationCtx, username: string) {
  const user = await ctx.db
    .query('users')
    .withIndex('by_username', (q) => q.eq('username', username.toLowerCase()))
    .first();
  if (!user) throw new Error(`No user named ${username}`);
  return user;
}

async function trackIdsOf(ctx: MutationCtx, playlistId: Id<'playlists'>) {
  const playlistTracks = await ctx.db
    .query('playlist_tracks')
    .withIndex('by_playlist_position', (q) => q.eq('playlist_id', playlistId))
    .collect();
  return playlistTracks.map((playlistTrack) => playlistTrack.track_id);
}

/**
 * Move one account's playlists to another, for when the same person ended up
 * with two accounts (a migrated one and a Discogs sign-in). Regular playlists
 * change owner and keep their share links. Favorited tracks are copied into
 * the destination's Favorites; the source's Favorites stay as they were.
 */
export const transferPlaylists = internalMutation({
  args: {
    fromUsername: v.string(),
    toUsername: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { fromUsername, toUsername, dryRun = false }) => {
    const from = await userByUsername(ctx, fromUsername);
    const to = await userByUsername(ctx, toUsername);
    if (from._id === to._id) throw new Error('Pick two different accounts');

    const sourcePlaylists = await getPlaylistsForUser(ctx, from);
    const regular = sourcePlaylists.filter(
      (playlist) => !isLegacyFlagSet(playlist.is_favorites),
    );
    const sourceFavorites = sourcePlaylists.filter((playlist) =>
      isLegacyFlagSet(playlist.is_favorites),
    );

    const favoriteTrackIds: Id<'tracks'>[] = [];
    for (const playlist of sourceFavorites) {
      favoriteTrackIds.push(...(await trackIdsOf(ctx, playlist._id)));
    }
    const targetFavorites = (await getPlaylistsForUser(ctx, to)).find(
      (playlist) => isLegacyFlagSet(playlist.is_favorites),
    );
    const alreadyFavorite = new Set(
      targetFavorites ? await trackIdsOf(ctx, targetFavorites._id) : [],
    );
    const uniqueFavorites = [...new Set(favoriteTrackIds)];
    const favoritesToAdd = uniqueFavorites.filter(
      (trackId) => !alreadyFavorite.has(trackId),
    );

    if (!dryRun) {
      const now = new Date().toISOString();
      // Owners are stored the way createPlaylist stores them.
      const owner = to.email ?? to._id;
      for (const playlist of regular) {
        await ctx.db.patch(playlist._id, { user_id: owner, updated_at: now });
      }

      if (favoritesToAdd.length > 0) {
        const favoritesId =
          targetFavorites?._id ??
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
        const last = await ctx.db
          .query('playlist_tracks')
          .withIndex('by_playlist_position', (q) =>
            q.eq('playlist_id', favoritesId),
          )
          .order('desc')
          .first();
        let position = (last?.position ?? -1) + 1;
        for (const trackId of favoritesToAdd) {
          await ctx.db.insert('playlist_tracks', {
            id: crypto.randomUUID(),
            playlist_id: favoritesId,
            track_id: trackId,
            position: position++,
            created_at: now,
          });
        }
      }
    }

    return {
      dryRun,
      from: from.username,
      to: to.username,
      moved: regular.map((playlist) => ({
        title: playlist.title,
        visibility: playlistVisibility(playlist),
        shareId: playlist.share_id ?? null,
      })),
      favoritesAdded: favoritesToAdd.length,
      favoritesAlreadyThere: uniqueFavorites.length - favoritesToAdd.length,
    };
  },
});
