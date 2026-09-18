import { getAuthUserId } from '@convex-dev/auth/server';
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';

/** Public queries must never hand OAuth tokens to the browser. */
function withoutTokens(connection: Doc<'user_music_connections'>) {
  const {
    accessToken: _accessToken,
    accessTokenSecret: _accessTokenSecret,
    refreshToken: _refreshToken,
    ...rest
  } = connection;
  return rest;
}

/**
 * Get all music service connections for the current user
 */
export const getUserConnections = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const connections = await ctx.db
      .query('user_music_connections')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return connections.map(withoutTokens);
  },
});

/**
 * Get a specific connection for a provider
 */
export const getConnectionByProvider = query({
  args: { provider: v.string() },
  handler: async (ctx, { provider }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const connection = await ctx.db
      .query('user_music_connections')
      .withIndex('by_user_provider', (q) =>
        q.eq('userId', userId).eq('provider', provider),
      )
      .first();
    return connection ? withoutTokens(connection) : null;
  },
});

/**
 * Store or update a music service connection
 */
export const upsertConnection = mutation({
  args: {
    provider: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    providerUserId: v.string(),
    providerUsername: v.optional(v.string()),
    providerData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Check if connection already exists
    const existing = await ctx.db
      .query('user_music_connections')
      .withIndex('by_user_provider', (q) =>
        q.eq('userId', userId).eq('provider', args.provider),
      )
      .first();

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        providerUserId: args.providerUserId,
        providerUsername: args.providerUsername,
        providerData: args.providerData,
      });
      return { connectionId: existing._id, isNew: false };
    } else {
      // Create new connection
      const connectionId = await ctx.db.insert('user_music_connections', {
        userId,
        provider: args.provider,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        providerUserId: args.providerUserId,
        providerUsername: args.providerUsername,
        providerData: args.providerData,
      });
      return { connectionId, isNew: true };
    }
  },
});

/**
 * Remove a music service connection
 */
export const removeConnection = mutation({
  args: { provider: v.string() },
  handler: async (ctx, { provider }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const connection = await ctx.db
      .query('user_music_connections')
      .withIndex('by_user_provider', (q) =>
        q.eq('userId', userId).eq('provider', provider),
      )
      .first();

    if (!connection) {
      throw new Error('Connection not found');
    }

    await ctx.db.delete(connection._id);
    return { success: true };
  },
});
