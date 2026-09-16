import { getAuthUserId } from '@convex-dev/auth/server';
import { query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Get all tracks for the authenticated user
 * Uses indexed queries to avoid reading the entire tracks table
 *
 * Data sources (checked in order):
 * 1. supabaseUserId - for existing users with migrated Supabase data
 * 2. user_discogs_profile by email - fallback for legacy data
 * 3. user_releases by Convex userId - for new users who connect Discogs directly
 *
 * New users without any Discogs connection will get an empty array,
 * which is expected - they need to connect Discogs first to import tracks.
 */
export const getUserTracks = query({
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

    // Try multiple strategies to find user's releases
    let userReleases: any[] = [];

    // Strategy 1: Check supabaseUserId (for migrated Supabase users)
    if (user.supabaseUserId) {
      userReleases = await ctx.db
        .query('user_releases')
        .withIndex('by_user', (q) => q.eq('user_id', user.supabaseUserId!))
        .collect();
    }

    // Strategy 2: Check by email (legacy fallback)
    if (userReleases.length === 0 && user.email) {
      userReleases = await ctx.db
        .query('user_releases')
        .withIndex('by_user', (q) => q.eq('user_id', user.email!))
        .collect();
    }

    // Strategy 3: Check by Convex userId (for new users who connect Discogs directly)
    if (userReleases.length === 0) {
      userReleases = await ctx.db
        .query('user_releases')
        .withIndex('by_user', (q) => q.eq('user_id', userId))
        .collect();
    }

    // No releases found - user needs to connect Discogs
    if (userReleases.length === 0) {
      return [];
    }

    // Fetch tracks for each release using the index
    // This is more efficient than fetching ALL tracks
    const allTracks: any[] = [];

    for (const release of userReleases) {
      const releaseTracks = await ctx.db
        .query('tracks')
        .withIndex('by_discogs_release', (q) =>
          q.eq('discogs_release_id', release.discogs_release_id),
        )
        .collect();

      allTracks.push(...releaseTracks);
    }

    return allTracks;
  },
});

/**
 * Get paginated tracks for the authenticated user
 * Use this for large collections
 */
export const getUserTracksPaginated = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { cursor, limit = 50 }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { tracks: [], nextCursor: null };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return { tracks: [], nextCursor: null };
    }

    // Try multiple strategies to find user's releases
    let userReleases: any[] = [];

    if (user.supabaseUserId) {
      userReleases = await ctx.db
        .query('user_releases')
        .withIndex('by_user', (q) => q.eq('user_id', user.supabaseUserId!))
        .collect();
    }

    if (userReleases.length === 0 && user.email) {
      userReleases = await ctx.db
        .query('user_releases')
        .withIndex('by_user', (q) => q.eq('user_id', user.email!))
        .collect();
    }

    if (userReleases.length === 0) {
      userReleases = await ctx.db
        .query('user_releases')
        .withIndex('by_user', (q) => q.eq('user_id', userId))
        .collect();
    }

    if (userReleases.length === 0) {
      return { tracks: [], nextCursor: null };
    }

    const releaseIds = new Set(
      userReleases.map((r) => String(r.discogs_release_id)),
    );

    // Get paginated tracks
    let tracksQuery = ctx.db.query('tracks').order('desc');

    const results = await tracksQuery.paginate({
      cursor: cursor ?? null,
      numItems: limit * 2, // Fetch more to filter
    });

    // Filter to only user's tracks
    const userTracks = results.page
      .filter((track) => releaseIds.has(String(track.discogs_release_id)))
      .slice(0, limit);

    return {
      tracks: userTracks,
      nextCursor: results.continueCursor,
      isDone: results.isDone,
    };
  },
});

/**
 * Get a single track by ID
 */
export const getTrack = query({
  args: { trackId: v.id('tracks') },
  handler: async (ctx, { trackId }) => {
    return await ctx.db.get(trackId);
  },
});

/**
 * Get track by old string ID (for compatibility)
 */
export const getTrackByOldId = query({
  args: { oldId: v.string() },
  handler: async (ctx, { oldId }) => {
    return await ctx.db
      .query('tracks')
      .withIndex('by_old_id', (q) => q.eq('id', oldId))
      .first();
  },
});

/**
 * Get tracks by Discogs release ID
 * This is used to display tracks for a specific release
 */
export const getTracksByReleaseId = query({
  args: { releaseId: v.union(v.string(), v.number()) },
  handler: async (ctx, { releaseId }) => {
    // Convert to string for consistent comparison since the index may store either
    const releaseIdStr = String(releaseId);
    const releaseIdNum = Number(releaseId);

    // Try string first
    let tracks = await ctx.db
      .query('tracks')
      .withIndex('by_discogs_release', (q) =>
        q.eq('discogs_release_id', releaseIdStr),
      )
      .collect();

    // If no results, try number (for legacy data)
    if (tracks.length === 0 && !isNaN(releaseIdNum)) {
      tracks = await ctx.db
        .query('tracks')
        .withIndex('by_discogs_release', (q) =>
          q.eq('discogs_release_id', releaseIdNum),
        )
        .collect();
    }

    // Sort by position
    return tracks.sort((a, b) => {
      const posA = a.position || '';
      const posB = b.position || '';
      return posA.localeCompare(posB, undefined, { numeric: true });
    });
  },
});

/**
 * Search tracks by title or artist
 */
export const searchTracks = query({
  args: { searchQuery: v.string() },
  handler: async (ctx, { searchQuery }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return [];
    }

    // Try multiple strategies to find user's releases
    let userReleases: any[] = [];

    if (user.supabaseUserId) {
      userReleases = await ctx.db
        .query('user_releases')
        .withIndex('by_user', (q) => q.eq('user_id', user.supabaseUserId!))
        .collect();
    }

    if (userReleases.length === 0 && user.email) {
      userReleases = await ctx.db
        .query('user_releases')
        .withIndex('by_user', (q) => q.eq('user_id', user.email!))
        .collect();
    }

    if (userReleases.length === 0) {
      userReleases = await ctx.db
        .query('user_releases')
        .withIndex('by_user', (q) => q.eq('user_id', userId))
        .collect();
    }

    if (userReleases.length === 0) {
      return [];
    }

    const lowerQuery = searchQuery.toLowerCase();

    // Get user's tracks by fetching each release (limit for performance)
    const allTracks: any[] = [];
    for (const release of userReleases.slice(0, 20)) {
      const releaseTracks = await ctx.db
        .query('tracks')
        .withIndex('by_discogs_release', (q) =>
          q.eq('discogs_release_id', release.discogs_release_id),
        )
        .collect();
      allTracks.push(...releaseTracks);
    }

    // Filter by search query
    return allTracks
      .filter(
        (track) =>
          track.title.toLowerCase().includes(lowerQuery) ||
          track.artist.toLowerCase().includes(lowerQuery),
      )
      .slice(0, 50);
  },
});
