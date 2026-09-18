import { getAuthUserId } from '@convex-dev/auth/server';
import { query, internalMutation, type QueryCtx } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { pickCollectionOwnerKey, releasesToRemove } from './lib/discogsOAuth';
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

async function resolveCollectionOwnerKey(
  ctx: QueryCtx,
  user: Doc<'users'>,
): Promise<string> {
  const keys = [user.supabaseUserId, user.email, user._id].filter(
    (k): k is string => !!k,
  );
  const candidates = await Promise.all(
    keys.map(async (key) => ({
      key,
      hasRows: !!(await ctx.db
        .query('user_releases')
        .withIndex('by_user', (q) => q.eq('user_id', key))
        .first()),
    })),
  );
  return pickCollectionOwnerKey(candidates, user._id);
}

/**
 * Upsert one page of a user's Discogs collection. Called by the sync action.
 */
export const ingestReleasesForUser = internalMutation({
  args: {
    userId: v.id('users'),
    // CollectionResponse['releases'] items from the SDK
    releases: v.array(v.any()),
  },
  handler: async (ctx, { userId, releases }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const ownerKey = await resolveCollectionOwnerKey(ctx, user);

    for (const release of releases) {
      const discogsReleaseId = String(release.id);

      const existingRelease = await ctx.db
        .query('discogs_releases')
        .withIndex('by_discogs_id', (q) =>
          q.eq('discogs_release_id', discogsReleaseId),
        )
        .first();

      if (existingRelease) {
        await ctx.db.patch(existingRelease._id, {
          basic_release_data: release,
        });
      } else {
        await ctx.db.insert('discogs_releases', {
          discogs_release_id: discogsReleaseId,
          basic_release_data: release,
          discogs_release_data: null,
          uploaded_at: new Date().toISOString(),
        });
      }

      const existingUserRelease = await ctx.db
        .query('user_releases')
        .withIndex('by_user_and_release', (q) =>
          q.eq('user_id', ownerKey).eq('discogs_release_id', discogsReleaseId),
        )
        .first();

      if (!existingUserRelease) {
        await ctx.db.insert('user_releases', {
          user_id: ownerKey,
          discogs_release_id: discogsReleaseId,
        });
      }
    }

    return { count: releases.length };
  },
});

/**
 * After a full sync, unlink releases the user no longer has on Discogs.
 */
export const pruneReleasesForUser = internalMutation({
  args: {
    userId: v.id('users'),
    currentReleaseIds: v.array(v.string()),
  },
  handler: async (ctx, { userId, currentReleaseIds }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const ownerKey = await resolveCollectionOwnerKey(ctx, user);

    const stored = await ctx.db
      .query('user_releases')
      .withIndex('by_user', (q) => q.eq('user_id', ownerKey))
      .collect();
    const toRemove = new Set(
      releasesToRemove(
        stored.map((r) => r.discogs_release_id),
        currentReleaseIds,
      ),
    );

    for (const row of stored) {
      if (toRemove.has(String(row.discogs_release_id))) {
        await ctx.db.delete(row._id);
      }
    }

    return { removed: toRemove.size };
  },
});
