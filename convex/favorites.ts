import { getAuthUserId } from '@convex-dev/auth/server';
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Helper to get or create the user's favorites playlist
 */
async function getOrCreateFavoritesPlaylist(
  ctx: any,
  userId: string,
  userEmail: string | undefined,
) {
  // First, try to find existing favorites playlist
  const allPlaylists = await ctx.db.query('playlists').collect();

  let favoritesPlaylist = allPlaylists.find(
    (p: any) =>
      (p.user_id === userEmail || p.user_id === userId) &&
      (p.is_favorites === true ||
        p.is_favorites === 't' ||
        p.is_favorites === 'true'),
  );

  if (!favoritesPlaylist) {
    // Create favorites playlist
    const playlistId = await ctx.db.insert('playlists', {
      id: crypto.randomUUID(),
      user_id: userEmail || userId,
      title: 'Favorites',
      description: 'Your favorite tracks',
      is_public: false,
      is_favorites: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    favoritesPlaylist = await ctx.db.get(playlistId);
  }

  return favoritesPlaylist;
}

/**
 * Get user's favorite tracks
 */
export const getFavorites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { favoriteTrackIds: [], favorites: [] };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return { favoriteTrackIds: [], favorites: [] };
    }

    // Find the favorites playlist
    const allPlaylists = await ctx.db.query('playlists').collect();
    const favoritesPlaylist = allPlaylists.find(
      (p) =>
        (p.user_id === user.email || p.user_id === userId) &&
        (p.is_favorites === true ||
          p.is_favorites === 't' ||
          p.is_favorites === 'true'),
    );

    if (!favoritesPlaylist) {
      return { favoriteTrackIds: [], favorites: [] };
    }

    // Get playlist tracks
    const playlistTracks = await ctx.db
      .query('playlist_tracks')
      .filter((q) => q.eq(q.field('playlist_id'), favoritesPlaylist._id))
      .collect();

    // Get the actual tracks
    const favorites = await Promise.all(
      playlistTracks.map(async (pt) => {
        const track = await ctx.db.get(pt.track_id);
        return track
          ? {
              track_id: track.id, // Old string ID for compatibility
              _trackId: track._id, // Convex ID
              created_at: pt.created_at,
              tracks: track, // Nested track for API compatibility
            }
          : null;
      }),
    );

    const validFavorites = favorites.filter(Boolean);
    const favoriteTrackIds = validFavorites.map((f) => f?.track_id);

    return {
      favoriteTrackIds,
      favorites: validFavorites,
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
  handler: async (ctx, { trackId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get or create favorites playlist
    const favoritesPlaylist = await getOrCreateFavoritesPlaylist(
      ctx,
      userId,
      user.email,
    );

    // Resolve track ID - if string, look up by old ID
    let convexTrackId = trackId;
    if (typeof trackId === 'string' && !trackId.startsWith('j')) {
      // Looks like an old UUID, find by old_id
      const track = await ctx.db
        .query('tracks')
        .withIndex('by_old_id', (q) => q.eq('id', trackId))
        .first();

      if (!track) {
        throw new Error('Track not found');
      }
      convexTrackId = track._id;
    }

    // Check if already in favorites
    const existingTracks = await ctx.db
      .query('playlist_tracks')
      .filter((q) => q.eq(q.field('playlist_id'), favoritesPlaylist._id))
      .collect();

    const alreadyFavorited = existingTracks.some(
      (pt) => pt.track_id === convexTrackId,
    );
    if (alreadyFavorited) {
      return { success: true, message: 'Track already in favorites' };
    }

    // Get highest position
    const maxPosition = existingTracks.reduce(
      (max, pt) => Math.max(max, pt.position),
      -1,
    );

    // Add to favorites
    await ctx.db.insert('playlist_tracks', {
      id: crypto.randomUUID(),
      playlist_id: favoritesPlaylist._id,
      track_id: convexTrackId as any, // Type assertion for flexibility
      position: maxPosition + 1,
      created_at: new Date().toISOString(),
    });

    return { success: true, message: 'Added to favorites' };
  },
});

/**
 * Remove a track from favorites
 */
export const removeFavorite = mutation({
  args: {
    trackId: v.union(v.id('tracks'), v.string()),
  },
  handler: async (ctx, { trackId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find favorites playlist
    const allPlaylists = await ctx.db.query('playlists').collect();
    const favoritesPlaylist = allPlaylists.find(
      (p) =>
        (p.user_id === user.email || p.user_id === userId) &&
        (p.is_favorites === true ||
          p.is_favorites === 't' ||
          p.is_favorites === 'true'),
    );

    if (!favoritesPlaylist) {
      return { success: true, message: 'No favorites playlist' };
    }

    // Resolve track ID
    let convexTrackId = trackId;
    if (typeof trackId === 'string' && !trackId.startsWith('j')) {
      const track = await ctx.db
        .query('tracks')
        .withIndex('by_old_id', (q) => q.eq('id', trackId))
        .first();

      if (track) {
        convexTrackId = track._id;
      }
    }

    // Find and remove
    const playlistTrack = await ctx.db
      .query('playlist_tracks')
      .filter((q) =>
        q.and(
          q.eq(q.field('playlist_id'), favoritesPlaylist._id),
          q.eq(q.field('track_id'), convexTrackId),
        ),
      )
      .first();

    if (playlistTrack) {
      await ctx.db.delete(playlistTrack._id);
    }

    return { success: true, message: 'Removed from favorites' };
  },
});

/**
 * Check if a track is favorited
 */
export const isFavorited = query({
  args: { trackId: v.union(v.id('tracks'), v.string()) },
  handler: async (ctx, { trackId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return false;
    }

    // Find favorites playlist
    const allPlaylists = await ctx.db.query('playlists').collect();
    const favoritesPlaylist = allPlaylists.find(
      (p) =>
        (p.user_id === user.email || p.user_id === userId) &&
        (p.is_favorites === true ||
          p.is_favorites === 't' ||
          p.is_favorites === 'true'),
    );

    if (!favoritesPlaylist) {
      return false;
    }

    // Resolve track ID
    let convexTrackId = trackId;
    if (typeof trackId === 'string' && !trackId.startsWith('j')) {
      const track = await ctx.db
        .query('tracks')
        .withIndex('by_old_id', (q) => q.eq('id', trackId))
        .first();

      if (track) {
        convexTrackId = track._id;
      }
    }

    // Check if in favorites
    const playlistTrack = await ctx.db
      .query('playlist_tracks')
      .filter((q) =>
        q.and(
          q.eq(q.field('playlist_id'), favoritesPlaylist._id),
          q.eq(q.field('track_id'), convexTrackId),
        ),
      )
      .first();

    return !!playlistTrack;
  },
});
