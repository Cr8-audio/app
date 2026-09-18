/**
 * Discogs connection: OAuth 1.0a, token storage and collection sync.
 *
 * Tokens live in `user_music_connections`, not in browser cookies, so anything
 * acting for the user server-side (the chat agent, the future MCP server) can
 * reach their collection. Tokens never leave the server: public functions
 * return status only.
 *
 * Two flows share the OAuth dance and the callback page
 * (`/connect/discogs/callback`):
 * - Sign in: `startSignIn` → discogs.com → the page calls Convex Auth's
 *   `signIn('discogs', …)` (see `discogsAuth.ts`), which verifies the Discogs
 *   identity, signs the user in and stores tokens.
 * - Connect/reconnect while signed in: `startConnection` → discogs.com →
 *   `completeConnection`.
 * Either way `syncCollection` then runs in the background.
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from './_generated/server';
import {
  MIN_SIGN_IN_NONCE_LENGTH,
  discogsCallbackUrl,
  hashNonce,
  isAllowedAppOrigin,
  isRequestExpired,
} from './lib/discogsOAuth';
import {
  createDiscogsSdk as createSdk,
  exchangeDiscogsVerifier,
} from './lib/discogsClient';
import { buildSearchParams, rankSearchResults } from './lib/discogsSearch';

const PROVIDER = 'discogs';
const PAGE_SIZE = 100;

async function getDiscogsConnection(ctx: MutationCtx, userId: Id<'users'>) {
  return await ctx.db
    .query('user_music_connections')
    .withIndex('by_user_provider', (q) =>
      q.eq('userId', userId).eq('provider', PROVIDER),
    )
    .first();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sign in with Discogs, step 1 (no Crate session needed). `nonce` is a random
 * value the browser keeps and sends back with `signIn`, so a callback link
 * from someone else's authorization can't sign this browser into their
 * account.
 */
export const startSignIn = action({
  args: { origin: v.string(), nonce: v.string() },
  handler: async (ctx, { origin, nonce }): Promise<{ authUrl: string }> => {
    if (!isAllowedAppOrigin(origin)) {
      throw new Error(`Origin not allowed: ${origin}`);
    }
    if (nonce.length < MIN_SIGN_IN_NONCE_LENGTH) {
      throw new Error('Invalid sign-in nonce');
    }

    const sdk = createSdk(discogsCallbackUrl(origin));
    const { verificationURL, requestTokens } = await sdk.auth.getRequestToken();

    await ctx.runMutation(internal.discogs.savePendingRequest, {
      nonceHash: await hashNonce(nonce),
      requestToken: requestTokens.token,
      requestTokenSecret: requestTokens.secret,
    });

    return { authUrl: verificationURL };
  },
});

/** Connect step 1: get a request token and the discogs.com URL to send the user to. */
export const startConnection = action({
  args: { origin: v.string() },
  handler: async (ctx, { origin }): Promise<{ authUrl: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }
    if (!isAllowedAppOrigin(origin)) {
      throw new Error(`Origin not allowed: ${origin}`);
    }

    const sdk = createSdk(discogsCallbackUrl(origin));
    const { verificationURL, requestTokens } = await sdk.auth.getRequestToken();

    await ctx.runMutation(internal.discogs.savePendingRequest, {
      userId,
      requestToken: requestTokens.token,
      requestTokenSecret: requestTokens.secret,
    });

    return { authUrl: verificationURL };
  },
});

/** Connect step 2: exchange the verifier from the callback for access tokens. */
export const completeConnection = action({
  args: { oauthToken: v.string(), oauthVerifier: v.string() },
  handler: async (
    ctx,
    { oauthToken, oauthVerifier },
  ): Promise<{ username: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const pending = await ctx.runQuery(internal.discogs.getPendingRequest, {
      requestToken: oauthToken,
    });
    if (!pending || pending.userId !== userId) {
      throw new Error('Unknown or already used Discogs authorization');
    }
    if (isRequestExpired(pending.createdAt, Date.now())) {
      await ctx.runMutation(internal.discogs.deletePendingRequest, {
        id: pending._id,
      });
      throw new Error('Discogs authorization expired, please try again');
    }

    const authorization = await exchangeDiscogsVerifier(pending, oauthVerifier);
    await ctx.runMutation(internal.discogs.saveConnection, {
      userId,
      pendingId: pending._id,
      ...authorization,
    });

    return { username: authorization.username };
  },
});

/** Connection status for the UI. Never includes tokens. */
export const getConnectionStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const connection = await ctx.db
      .query('user_music_connections')
      .withIndex('by_user_provider', (q) =>
        q.eq('userId', userId).eq('provider', PROVIDER),
      )
      .first();
    if (!connection) {
      return { connected: false as const };
    }
    return {
      connected: true as const,
      // Connections from before token secrets were stored can't sign requests.
      needsReconnection: !connection.accessTokenSecret,
      username: connection.providerUsername ?? null,
      syncStatus: connection.syncStatus ?? null,
      syncError: connection.syncError ?? null,
      lastSyncedAt: connection.lastSyncedAt ?? null,
      releaseCount: connection.releaseCount ?? null,
    };
  },
});

/** Re-sync the collection from Discogs. */
export const requestSync = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }
    const connection = await getDiscogsConnection(ctx, userId);
    if (!connection?.accessTokenSecret) {
      throw new Error('Discogs is not connected');
    }
    if (connection.syncStatus === 'syncing') {
      return { started: false };
    }
    await ctx.db.patch(connection._id, {
      syncStatus: 'syncing',
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.discogs.syncCollection, {
      userId,
    });
    return { started: true };
  },
});

/**
 * Forget the Discogs tokens and profile. The synced collection stays, so
 * playlists built from it keep working; reconnecting re-syncs it.
 */
export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }
    const connection = await getDiscogsConnection(ctx, userId);
    if (connection) {
      await ctx.db.delete(connection._id);
    }
    const profiles = await ctx.db
      .query('user_discogs_profile')
      .withIndex('by_user', (q) => q.eq('user_id', userId))
      .collect();
    for (const profile of profiles) {
      await ctx.db.delete(profile._id);
    }
  },
});

/**
 * Search the Discogs database. Signs with the user's tokens when connected
 * (240 req/min); otherwise falls back to the app key (60 req/min).
 */
export const search = action({
  args: { query: v.string() },
  handler: async (ctx, { query: rawQuery }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }
    const query = rawQuery.trim();
    if (!query) {
      return { results: [] };
    }

    const sdk = createSdk();
    const credentials = await ctx.runQuery(internal.discogs.getCredentials, {
      userId,
    });
    if (credentials) {
      const tokenManager = sdk.auth.base.getTokenManager();
      await tokenManager.setAccessToken(credentials.accessToken);
      await tokenManager.setAccessTokenSecret(credentials.accessTokenSecret);
    }

    const response = await sdk.search.getSearchResults(
      buildSearchParams(query),
    );
    return { results: rankSearchResults(query, response.results) };
  },
});

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

export const savePendingRequest = internalMutation({
  args: {
    userId: v.optional(v.id('users')),
    nonceHash: v.optional(v.string()),
    requestToken: v.string(),
    requestTokenSecret: v.string(),
  },
  handler: async (ctx, args) => {
    // One pending connect per user; a new "Connect" click replaces it.
    if (args.userId) {
      const stale = await ctx.db
        .query('discogs_oauth_requests')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .collect();
      for (const row of stale) {
        await ctx.db.delete(row._id);
      }
    }
    await ctx.db.insert('discogs_oauth_requests', {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getPendingRequest = internalQuery({
  args: { requestToken: v.string() },
  handler: async (ctx, { requestToken }) => {
    return await ctx.db
      .query('discogs_oauth_requests')
      .withIndex('by_request_token', (q) => q.eq('requestToken', requestToken))
      .first();
  },
});

export const deletePendingRequest = internalMutation({
  args: { id: v.id('discogs_oauth_requests') },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const saveConnection = internalMutation({
  args: {
    userId: v.id('users'),
    pendingId: v.id('discogs_oauth_requests'),
    accessToken: v.string(),
    accessTokenSecret: v.string(),
    discogsUserId: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, username } = args;
    const pending = await ctx.db.get(args.pendingId);
    if (pending) {
      await ctx.db.delete(pending._id);
    }

    const fields = {
      accessToken: args.accessToken,
      accessTokenSecret: args.accessTokenSecret,
      providerUserId: args.discogsUserId,
      providerUsername: username,
      syncStatus: 'syncing' as const,
      syncError: undefined,
    };
    const existing = await getDiscogsConnection(ctx, userId);
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert('user_music_connections', {
        userId,
        provider: PROVIDER,
        ...fields,
      });
    }

    // Keep the profile table (used across the UI for the username) in step.
    const profile = await ctx.db
      .query('user_discogs_profile')
      .withIndex('by_user', (q) => q.eq('user_id', userId))
      .first();
    if (profile) {
      await ctx.db.patch(profile._id, { username });
    } else {
      await ctx.db.insert('user_discogs_profile', {
        user_id: userId,
        username,
      });
    }

    await ctx.scheduler.runAfter(0, internal.discogs.syncCollection, {
      userId,
    });
  },
});

/** Tokens for server-side callers (sync, agent tools, MCP). */
export const getCredentials = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const connection = await ctx.db
      .query('user_music_connections')
      .withIndex('by_user_provider', (q) =>
        q.eq('userId', userId).eq('provider', PROVIDER),
      )
      .first();
    if (!connection?.accessTokenSecret || !connection.providerUsername) {
      return null;
    }
    return {
      accessToken: connection.accessToken,
      accessTokenSecret: connection.accessTokenSecret,
      username: connection.providerUsername,
    };
  },
});

export const setSyncResult = internalMutation({
  args: {
    userId: v.id('users'),
    ok: v.boolean(),
    releaseCount: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { userId, ok, releaseCount, error }) => {
    const connection = await getDiscogsConnection(ctx, userId);
    if (!connection) {
      return;
    }
    await ctx.db.patch(
      connection._id,
      ok
        ? {
            syncStatus: 'done',
            syncError: undefined,
            lastSyncedAt: Date.now(),
            releaseCount,
          }
        : { syncStatus: 'error', syncError: error },
    );
  },
});

/** Pull the whole collection (folder 0 = "All") page by page into Convex. */
export const syncCollection = internalAction({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const credentials = await ctx.runQuery(internal.discogs.getCredentials, {
      userId,
    });
    if (!credentials) {
      await ctx.runMutation(internal.discogs.setSyncResult, {
        userId,
        ok: false,
        error: 'Discogs is not connected',
      });
      return;
    }

    try {
      const sdk = createSdk();
      const tokenManager = sdk.auth.base.getTokenManager();
      await tokenManager.setAccessToken(credentials.accessToken);
      await tokenManager.setAccessTokenSecret(credentials.accessTokenSecret);

      const seen: string[] = [];
      let page = 1;
      let pages = 1;
      do {
        const response = await sdk.collection.getCollection({
          username: credentials.username,
          folderId: 0,
          page,
          perPage: PAGE_SIZE,
        });
        pages = response.pagination.pages;
        await ctx.runMutation(
          internal.discogsCollection.ingestReleasesForUser,
          {
            userId,
            releases: response.releases,
          },
        );
        seen.push(...response.releases.map((r) => String(r.id)));
        page++;
      } while (page <= pages);

      await ctx.runMutation(internal.discogsCollection.pruneReleasesForUser, {
        userId,
        currentReleaseIds: seen,
      });
      await ctx.runMutation(internal.discogs.setSyncResult, {
        userId,
        ok: true,
        releaseCount: new Set(seen).size,
      });
    } catch (error) {
      await ctx.runMutation(internal.discogs.setSyncResult, {
        userId,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
