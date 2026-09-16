import { getAuthUserId } from '@convex-dev/auth/server';
import { query, mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Get the current authenticated user with all profile fields
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

/**
 * Get a user by their username (for public profiles)
 */
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    return await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', username))
      .first();
  },
});

/**
 * Check if a username is available
 */
export const checkUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    // Validate username format
    if (username.length < 3 || username.length > 30) {
      return { available: false, error: 'Username must be 3-30 characters' };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return {
        available: false,
        error:
          'Username can only contain letters, numbers, underscores, and hyphens',
      };
    }

    const existing = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', username))
      .first();

    return {
      available: !existing,
      error: existing ? 'Username is already taken' : null,
    };
  },
});

/**
 * Set username for the current user (during onboarding)
 */
export const setUsername = mutation({
  args: {
    username: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, { username, displayName }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Validate username format
    if (username.length < 3 || username.length > 30) {
      throw new Error('Username must be 3-30 characters');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new Error(
        'Username can only contain letters, numbers, underscores, and hyphens',
      );
    }

    // Check if username is already taken
    const existing = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', username))
      .first();

    if (existing && existing._id !== userId) {
      throw new Error('Username is already taken');
    }

    // Update user with username - move to connections step (not complete yet)
    await ctx.db.patch(userId, {
      username: username.toLowerCase(),
      displayName: displayName || username,
      onboardingStep: 'connections',
    });

    return { success: true, username: username.toLowerCase() };
  },
});

/**
 * Update onboarding step
 */
export const updateOnboardingStep = mutation({
  args: {
    step: v.union(
      v.literal('username'),
      v.literal('connections'),
      v.literal('complete'),
    ),
  },
  handler: async (ctx, { step }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    await ctx.db.patch(userId, {
      onboardingStep: step,
      onboardingComplete: step === 'complete',
    });

    return { success: true, step };
  },
});

/**
 * Complete onboarding (skip or finish connections step)
 */
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    await ctx.db.patch(userId, {
      onboardingStep: 'complete',
      onboardingComplete: true,
    });

    return { success: true };
  },
});

/**
 * Update user profile
 */
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    await ctx.db.patch(userId, args);
    return { success: true };
  },
});

/**
 * Link Supabase user ID to current user
 * This is needed to connect the new Convex user to their old Supabase data
 */
export const linkSupabaseUserId = mutation({
  args: {
    supabaseUserId: v.string(),
  },
  handler: async (ctx, { supabaseUserId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify this Supabase ID has data associated with it
    const releases = await ctx.db
      .query('user_releases')
      .withIndex('by_user', (q) => q.eq('user_id', supabaseUserId))
      .first();

    if (!releases) {
      throw new Error('No data found for this Supabase user ID');
    }

    await ctx.db.patch(userId, { supabaseUserId });
    return { success: true };
  },
});

/**
 * Try to automatically link legacy data based on matching criteria
 * Call this during onboarding to find and link existing data
 */
export const tryAutoLinkLegacyData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Already linked
    if (user.supabaseUserId) {
      return {
        success: true,
        linked: true,
        supabaseUserId: user.supabaseUserId,
      };
    }

    // Try to find matching data
    // Strategy: Look for a user_discogs_profile or user_releases entry
    // that might belong to this user

    // For now, we'll look for any user_discogs_profile and try to match
    // In a production app, you'd want a more sophisticated matching strategy

    // Get all user_discogs_profiles and check if any have data
    const profiles = await ctx.db.query('user_discogs_profile').collect();

    for (const profile of profiles) {
      // Check if this profile has releases
      const releases = await ctx.db
        .query('user_releases')
        .withIndex('by_user', (q) => q.eq('user_id', profile.user_id))
        .first();

      if (releases) {
        // Found a profile with data, link it
        // Note: In production, you'd want better verification
        console.log(
          'Found potential legacy data with user_id:',
          profile.user_id,
        );

        // For safety, don't auto-link without confirmation
        // Return the found ID so the user can confirm
        return {
          success: true,
          linked: false,
          potentialSupabaseUserId: profile.user_id,
          discogsUsername: profile.username,
        };
      }
    }

    return { success: true, linked: false, potentialSupabaseUserId: null };
  },
});

/**
 * Get the current user's Discogs profile
 * Returns null if not connected
 */
export const getDiscogsProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    // Try multiple identifiers for backwards compatibility
    // 1. By Convex user ID
    let profile = await ctx.db
      .query('user_discogs_profile')
      .withIndex('by_user', (q) => q.eq('user_id', userId))
      .first();

    // 2. By email
    if (!profile && user.email) {
      profile = await ctx.db
        .query('user_discogs_profile')
        .withIndex('by_user', (q) => q.eq('user_id', user.email!))
        .first();
    }

    // 3. By supabaseUserId (legacy)
    if (!profile && user.supabaseUserId) {
      profile = await ctx.db
        .query('user_discogs_profile')
        .withIndex('by_user', (q) => q.eq('user_id', user.supabaseUserId!))
        .first();
    }

    return profile;
  },
});

/**
 * Save or update Discogs profile for the current user
 */
export const saveDiscogsProfile = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, { username }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if profile already exists
    const existing = await ctx.db
      .query('user_discogs_profile')
      .withIndex('by_user', (q) => q.eq('user_id', userId))
      .first();

    if (existing) {
      // Update existing profile
      await ctx.db.patch(existing._id, { username });
      return { success: true, action: 'updated' };
    }

    // Create new profile
    await ctx.db.insert('user_discogs_profile', {
      user_id: userId,
      username,
    });

    return { success: true, action: 'created' };
  },
});

/**
 * Remove Discogs profile for the current user
 */
export const removeDiscogsProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find and delete all matching profiles
    let deletedCount = 0;

    // By Convex user ID
    const byUserId = await ctx.db
      .query('user_discogs_profile')
      .withIndex('by_user', (q) => q.eq('user_id', userId))
      .collect();

    for (const profile of byUserId) {
      await ctx.db.delete(profile._id);
      deletedCount++;
    }

    // By email
    if (user.email) {
      const byEmail = await ctx.db
        .query('user_discogs_profile')
        .withIndex('by_user', (q) => q.eq('user_id', user.email!))
        .collect();

      for (const profile of byEmail) {
        await ctx.db.delete(profile._id);
        deletedCount++;
      }
    }

    // By supabaseUserId (legacy)
    if (user.supabaseUserId) {
      const bySupabase = await ctx.db
        .query('user_discogs_profile')
        .withIndex('by_user', (q) => q.eq('user_id', user.supabaseUserId!))
        .collect();

      for (const profile of bySupabase) {
        await ctx.db.delete(profile._id);
        deletedCount++;
      }
    }

    return { success: true, deletedCount };
  },
});

/**
 * Get legacy data stats for a potential Supabase user ID
 * Used to show the user what data will be linked
 */
export const getLegacyDataStats = query({
  args: { supabaseUserId: v.string() },
  handler: async (ctx, { supabaseUserId }) => {
    const releases = await ctx.db
      .query('user_releases')
      .withIndex('by_user', (q) => q.eq('user_id', supabaseUserId))
      .collect();

    const playlists = await ctx.db
      .query('playlists')
      .withIndex('by_user', (q) => q.eq('user_id', supabaseUserId))
      .collect();

    const profile = await ctx.db
      .query('user_discogs_profile')
      .withIndex('by_user', (q) => q.eq('user_id', supabaseUserId))
      .first();

    return {
      releaseCount: releases.length,
      playlistCount: playlists.length,
      discogsUsername: profile?.username || null,
    };
  },
});

/**
 * Admin mutation to directly link a Supabase user ID to a Convex user
 * This is a temporary function for data migration
 * Call: users:adminLinkSupabaseId with convexUserId and supabaseUserId
 */
export const adminLinkSupabaseId = mutation({
  args: {
    convexUserId: v.id('users'),
    supabaseUserId: v.string(),
  },
  handler: async (ctx, { convexUserId, supabaseUserId }) => {
    // Verify the Supabase ID has data
    const releases = await ctx.db
      .query('user_releases')
      .withIndex('by_user', (q) => q.eq('user_id', supabaseUserId))
      .first();

    if (!releases) {
      throw new Error('No data found for this Supabase user ID');
    }

    await ctx.db.patch(convexUserId, { supabaseUserId });
    return { success: true };
  },
});
