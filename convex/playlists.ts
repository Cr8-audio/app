import { getAuthUserId } from '@convex-dev/auth/server';
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Get all playlists for the authenticated user
 */
export const getUserPlaylists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return [];
    }

    // Try to find playlists by different user identifiers
    let playlists: any[] = [];

    // 1. Try by supabaseUserId (linked legacy data)
    if (user.supabaseUserId) {
      playlists = await ctx.db
        .query('playlists')
        .withIndex('by_user', (q) => q.eq('user_id', user.supabaseUserId!))
        .collect();
    }

    // 2. Try by email
    if (playlists.length === 0 && user.email) {
      playlists = await ctx.db
        .query('playlists')
        .withIndex('by_user', (q) => q.eq('user_id', user.email!))
        .collect();
    }

    // 3. Try by Convex ID
    if (playlists.length === 0) {
      playlists = await ctx.db
        .query('playlists')
        .withIndex('by_user', (q) => q.eq('user_id', userId))
        .collect();
    }

    // Get tracks for each playlist
    const playlistsWithTracks = await Promise.all(
      playlists.map(async (playlist) => {
        const playlistTracks = await ctx.db
          .query('playlist_tracks')
          .filter((q) => q.eq(q.field('playlist_id'), playlist._id))
          .collect();

        const tracks = await Promise.all(
          playlistTracks.map(async (pt) => {
            const track = await ctx.db.get(pt.track_id);
            return track ? { ...track, position: pt.position } : null;
          }),
        );

        return {
          ...playlist,
          tracks: tracks
            .filter(Boolean)
            .sort((a, b) => (a?.position || 0) - (b?.position || 0)),
        };
      }),
    );

    return playlistsWithTracks;
  },
});

/**
 * Get a single playlist with its tracks
 */
export const getPlaylist = query({
  args: { playlistId: v.id('playlists') },
  handler: async (ctx, { playlistId }) => {
    const playlist = await ctx.db.get(playlistId);
    if (!playlist) {
      return null;
    }

    // Get playlist tracks
    const playlistTracks = await ctx.db
      .query('playlist_tracks')
      .filter((q) => q.eq(q.field('playlist_id'), playlistId))
      .collect();

    // Get the actual tracks
    const tracks = await Promise.all(
      playlistTracks.map(async (pt) => {
        const track = await ctx.db.get(pt.track_id);
        return track ? { ...track, position: pt.position } : null;
      }),
    );

    return {
      ...playlist,
      tracks: tracks
        .filter(Boolean)
        .sort((a, b) => (a?.position || 0) - (b?.position || 0)),
    };
  },
});

/**
 * Get playlist by old string ID
 */
export const getPlaylistByOldId = query({
  args: { oldId: v.string() },
  handler: async (ctx, { oldId }) => {
    return await ctx.db
      .query('playlists')
      .withIndex('by_old_id', (q) => q.eq('id', oldId))
      .first();
  },
});

/**
 * Create a new playlist
 */
export const createPlaylist = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { title, description }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const playlistId = await ctx.db.insert('playlists', {
      id: crypto.randomUUID(), // Generate old-style UUID for compatibility
      user_id: user.email || userId, // Use email for consistency with migrated data
      title,
      description: description || '',
      is_public: false,
      is_favorites: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return await ctx.db.get(playlistId);
  },
});

/**
 * Update a playlist
 */
export const updatePlaylist = mutation({
  args: {
    playlistId: v.id('playlists'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    is_public: v.optional(v.boolean()),
  },
  handler: async (ctx, { playlistId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const playlist = await ctx.db.get(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Verify ownership - check all possible user ID formats
    const user = await ctx.db.get(userId);
    const isOwner =
      playlist.user_id === user?.email ||
      playlist.user_id === userId ||
      playlist.user_id === user?.supabaseUserId;

    if (!isOwner) {
      throw new Error('Not authorized');
    }

    await ctx.db.patch(playlistId, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    return await ctx.db.get(playlistId);
  },
});

/**
 * Delete a playlist
 */
export const deletePlaylist = mutation({
  args: { playlistId: v.id('playlists') },
  handler: async (ctx, { playlistId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const playlist = await ctx.db.get(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Verify ownership - check all possible user ID formats
    const user = await ctx.db.get(userId);
    const isOwner =
      playlist.user_id === user?.email ||
      playlist.user_id === userId ||
      playlist.user_id === user?.supabaseUserId;

    if (!isOwner) {
      throw new Error('Not authorized');
    }

    // Delete playlist tracks first
    const playlistTracks = await ctx.db
      .query('playlist_tracks')
      .filter((q) => q.eq(q.field('playlist_id'), playlistId))
      .collect();

    for (const pt of playlistTracks) {
      await ctx.db.delete(pt._id);
    }

    // Delete the playlist
    await ctx.db.delete(playlistId);

    return { success: true };
  },
});

/**
 * Add a track to a playlist
 */
export const addTrackToPlaylist = mutation({
  args: {
    playlistId: v.id('playlists'),
    trackId: v.id('tracks'),
  },
  handler: async (ctx, { playlistId, trackId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const playlist = await ctx.db.get(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Get current max position
    const existingTracks = await ctx.db
      .query('playlist_tracks')
      .filter((q) => q.eq(q.field('playlist_id'), playlistId))
      .collect();

    const maxPosition = existingTracks.reduce(
      (max, pt) => Math.max(max, pt.position),
      -1,
    );

    // Check if track already in playlist
    const existing = existingTracks.find((pt) => pt.track_id === trackId);
    if (existing) {
      return { success: true, message: 'Track already in playlist' };
    }

    await ctx.db.insert('playlist_tracks', {
      id: crypto.randomUUID(),
      playlist_id: playlistId,
      track_id: trackId,
      position: maxPosition + 1,
      created_at: new Date().toISOString(),
    });

    return { success: true };
  },
});

/**
 * Remove a track from a playlist
 */
export const removeTrackFromPlaylist = mutation({
  args: {
    playlistId: v.id('playlists'),
    trackId: v.id('tracks'),
  },
  handler: async (ctx, { playlistId, trackId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const playlistTrack = await ctx.db
      .query('playlist_tracks')
      .filter((q) =>
        q.and(
          q.eq(q.field('playlist_id'), playlistId),
          q.eq(q.field('track_id'), trackId),
        ),
      )
      .first();

    if (playlistTrack) {
      await ctx.db.delete(playlistTrack._id);
    }

    return { success: true };
  },
});
