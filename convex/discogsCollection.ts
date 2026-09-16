import { getAuthUserId } from '@convex-dev/auth/server';
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Get user's Discogs collection from the database
 */
export const getCollection = query({
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

    // Get release details
    const releases = await Promise.all(
      userReleases.map(async (ur) => {
        const release = await ctx.db
          .query('discogs_releases')
          .withIndex('by_discogs_id', (q) =>
            q.eq('discogs_release_id', ur.discogs_release_id),
          )
          .first();
        return release;
      }),
    );

    return releases.filter(Boolean);
  },
});

/**
 * Ingest a Discogs collection into the database
 */
export const ingestCollection = mutation({
  args: {
    releases: v.array(
      v.object({
        id: v.union(v.string(), v.number()),
        basic_information: v.optional(v.any()),
        // Allow any other fields
      }),
    ),
  },
  handler: async (ctx, { releases }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Determine user ID to use for storing releases
    const storageUserId = user.email || userId;

    // Process each release
    for (const release of releases) {
      const discogsReleaseId = String(release.id);

      // Check if release already exists
      const existingRelease = await ctx.db
        .query('discogs_releases')
        .withIndex('by_discogs_id', (q) =>
          q.eq('discogs_release_id', discogsReleaseId),
        )
        .first();

      if (!existingRelease) {
        // Insert new release
        await ctx.db.insert('discogs_releases', {
          discogs_release_id: discogsReleaseId,
          basic_release_data: release,
          discogs_release_data: null,
          uploaded_at: new Date().toISOString(),
        });
      }

      // Check if user already has this release
      const existingUserRelease = await ctx.db
        .query('user_releases')
        .withIndex('by_user_and_release', (q) =>
          q
            .eq('user_id', storageUserId)
            .eq('discogs_release_id', discogsReleaseId),
        )
        .first();

      if (!existingUserRelease) {
        // Link release to user
        await ctx.db.insert('user_releases', {
          user_id: storageUserId,
          discogs_release_id: discogsReleaseId,
        });
      }
    }

    return { success: true, count: releases.length };
  },
});
