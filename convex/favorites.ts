import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import {
  query,
  mutation,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import { isLegacyFlagSet } from './lib/playlistSharing';
import { getPlaylistsForUser } from './playlists';

type ReadCtx = Pick<QueryCtx, 'db'>;

/**
 * The user's Favorites playlists. Playlists are stored under whichever owner
 * key was current when they were made (Convex ID, email or migrated Supabase
 * ID), so one person can have several; they read as one list. The first is
 * where new favorites go: the email or Convex ID one they've always gone to,
 * else a migrated one, so a second list isn't created next to it.
 */
export async function favoritesPlaylistsOf(ctx: ReadCtx, user: Doc<'users'>) {
  const legacyLast = (playlist: Doc<'playlists'>) =>
    playlist.user_id === user.supabaseUserId ? 1 : 0;
  return (await getPlaylistsForUser(ctx, user))
    .filter((playlist) => isLegacyFlagSet(playlist.is_favorites))
    .sort(
      (a, b) =>
        legacyLast(a) - legacyLast(b) || a._creationTime - b._creationTime,
    );
}

async function signedInUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  return userId ? await ctx.db.get(userId) : null;
}

/** The app sends a Convex track ID or the old UUID kept in `tracks.id`. */
async function resolveTrackId(ctx: ReadCtx, trackId: string) {
  const convexId = ctx.db.normalizeId('tracks', trackId);
  if (convexId) return convexId;
  const track = await ctx.db
    .query('tracks')
    .withIndex('by_old_id', (q) => q.eq('id', trackId))
    .first();
  return track?._id ?? null;
}

function favoriteRow(
  ctx: ReadCtx,
  playlistId: Id<'playlists'>,
  trackId: Id<'tracks'>,
) {
  return ctx.db
    .query('playlist_tracks')
    .withIndex('by_playlist_track', (q) =>
      q.eq('playlist_id', playlistId).eq('track_id', trackId),
    )
    .first();
}

/**
 * Get user's favorite tracks
 */
export const getFavorites = query({
  args: {},
  handler: async (ctx) => {
    const user = await signedInUser(ctx);
    if (!user) {
      return { favoriteTrackIds: [], favorites: [] };
    }

    const rows = [];
    for (const playlist of await favoritesPlaylistsOf(ctx, user)) {
      rows.push(
        ...(await ctx.db
          .query('playlist_tracks')
          .withIndex('by_playlist_position', (q) =>
            q.eq('playlist_id', playlist._id),
          )
          .collect()),
      );
    }
    const seen = new Set<Id<'tracks'>>();
    const firstRows = rows.filter(
      (row) => !seen.has(row.track_id) && seen.add(row.track_id),
    );

    const favorites = (
      await Promise.all(
        firstRows.map(async (row) => {
          const track = await ctx.db.get(row.track_id);
          return track
            ? {
                track_id: track.id, // Old string ID for compatibility
                _trackId: track._id, // Convex ID
                created_at: row.created_at,
                tracks: track, // Nested track for API compatibility
              }
            : null;
        }),
      )
    ).filter((favorite) => favorite !== null);

    return {
      favoriteTrackIds: favorites.map((favorite) => favorite.track_id),
      favorites,
    };
  },
});

/**
 * Add a track to favorites
 */
export const addFavorite = mutation({
  args: {
    trackId: v.union(v.id('tracks'), v.string()), // Accept both Convex ID and old string ID
  },
  handler: async (ctx, args) => {
    const user = await signedInUser(ctx);
    if (!user) {
      throw new Error('Not authenticated');
    }

    const trackId = await resolveTrackId(ctx, args.trackId);
    if (!trackId) {
      throw new Error('Track not found');
    }

    const playlists = await favoritesPlaylistsOf(ctx, user);
    for (const playlist of playlists) {
      if (await favoriteRow(ctx, playlist._id, trackId)) {
        return { success: true, message: 'Track already in favorites' };
      }
    }

    const now = new Date().toISOString();
    const playlistId =
      playlists[0]?._id ??
      (await ctx.db.insert('playlists', {
        id: crypto.randomUUID(),
        user_id: user.email || user._id,
        title: 'Favorites',
        description: 'Your favorite tracks',
        is_public: false,
        is_favorites: true,
        created_at: now,
        updated_at: now,
      }));

    const last = await ctx.db
      .query('playlist_tracks')
      .withIndex('by_playlist_position', (q) => q.eq('playlist_id', playlistId))
      .order('desc')
      .first();
    await ctx.db.insert('playlist_tracks', {
      id: crypto.randomUUID(),
      playlist_id: playlistId,
      track_id: trackId,
      position: (last?.position ?? -1) + 1,
      created_at: now,
    });

    return { success: true, message: 'Added to favorites' };
  },
});

/**
 * Remove a track from favorites (from each Favorites playlist it's in)
 */
export const removeFavorite = mutation({
  args: {
    trackId: v.union(v.id('tracks'), v.string()),
  },
  handler: async (ctx, args) => {
    const user = await signedInUser(ctx);
    if (!user) {
      throw new Error('Not authenticated');
    }

    const trackId = await resolveTrackId(ctx, args.trackId);
    if (trackId) {
      for (const playlist of await favoritesPlaylistsOf(ctx, user)) {
        const row = await favoriteRow(ctx, playlist._id, trackId);
        if (row) await ctx.db.delete(row._id);
      }
    }

    return { success: true, message: 'Removed from favorites' };
  },
});

/**
 * Check if a track is favorited
 */
export const isFavorited = query({
  args: { trackId: v.union(v.id('tracks'), v.string()) },
  handler: async (ctx, args) => {
    const user = await signedInUser(ctx);
    if (!user) {
      return false;
    }

    const trackId = await resolveTrackId(ctx, args.trackId);
    if (!trackId) {
      return false;
    }

    for (const playlist of await favoritesPlaylistsOf(ctx, user)) {
      if (await favoriteRow(ctx, playlist._id, trackId)) return true;
    }
    return false;
  },
});
