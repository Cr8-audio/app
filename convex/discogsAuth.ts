/**
 * "Continue with Discogs": Discogs is Crate's sign-in.
 *
 * The browser calls `api.discogs.startSignIn`, the user approves on
 * discogs.com, and the callback page calls `signIn('discogs', { oauthToken,
 * oauthVerifier, nonce })`. `authorize` below proves the Discogs identity by
 * exchanging the verifier, then signs the user in to the account tied to that
 * Discogs user (creating or linking one via `createOrUpdateDiscogsUser`).
 */
import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials';
import { createAccount } from '@convex-dev/auth/server';
import type { GenericId } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import {
  exchangeDiscogsVerifier,
  fetchDiscogsAvatar,
} from './lib/discogsClient';
import { hashNonce, isRequestExpired } from './lib/discogsOAuth';

export const DISCOGS_AUTH_PROVIDER = 'discogs';

interface DiscogsProfile {
  discogsUserId: string;
  discogsUsername: string;
  avatarUrl?: string;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export const DiscogsSignIn = ConvexCredentials({
  id: DISCOGS_AUTH_PROVIDER,
  authorize: async (credentials, ctx) => {
    const oauthToken = readString(credentials.oauthToken);
    const oauthVerifier = readString(credentials.oauthVerifier);
    const nonce = readString(credentials.nonce);
    if (!oauthToken || !oauthVerifier || !nonce) {
      throw new Error('Missing Discogs authorization');
    }

    const pending = await ctx.runQuery(internal.discogs.getPendingRequest, {
      requestToken: oauthToken,
    });
    // Sign-in requests carry a nonce hash and no user; connect requests the reverse.
    if (!pending || pending.userId || !pending.nonceHash) {
      throw new Error('Unknown or already used Discogs authorization');
    }
    if (pending.nonceHash !== (await hashNonce(nonce))) {
      throw new Error('Discogs authorization was started in another browser');
    }
    if (isRequestExpired(pending.createdAt, Date.now())) {
      await ctx.runMutation(internal.discogs.deletePendingRequest, {
        id: pending._id,
      });
      throw new Error('Discogs authorization expired, please try again');
    }

    const authorization = await exchangeDiscogsVerifier(pending, oauthVerifier);
    const avatarUrl = await fetchDiscogsAvatar(authorization.username);
    const profile: DiscogsProfile = {
      discogsUserId: authorization.discogsUserId,
      discogsUsername: authorization.username,
      ...(avatarUrl ? { avatarUrl } : {}),
    };

    // Returns the existing account's user, or runs createOrUpdateDiscogsUser.
    const { user } = await createAccount(ctx, {
      provider: DISCOGS_AUTH_PROVIDER,
      account: { id: authorization.discogsUserId },
      profile: { ...profile },
    });
    const userId = user._id as Id<'users'>;

    await ctx.runMutation(internal.discogs.saveConnection, {
      userId,
      pendingId: pending._id,
      ...authorization,
    });

    return { userId };
  },
});

/**
 * Find the Crate user a Discogs identity already belongs to, from records
 * only the server could have written:
 * - a Discogs connection made through OAuth (it has a token secret), or
 * - a Discogs profile migrated from Supabase (keyed by email or Supabase id;
 *   rows keyed by a Convex id came from a public mutation and prove nothing).
 * Skips users already linked to a different Discogs sign-in.
 */
export async function findUserForDiscogsAccount(
  ctx: MutationCtx,
  { discogsUserId, discogsUsername }: DiscogsProfile,
): Promise<Id<'users'> | null> {
  const candidates: Id<'users'>[] = [];

  const connections = await ctx.db
    .query('user_music_connections')
    .withIndex('by_provider_user', (q) =>
      q.eq('provider', 'discogs').eq('providerUserId', discogsUserId),
    )
    .collect();
  for (const connection of connections) {
    if (connection.accessTokenSecret) candidates.push(connection.userId);
  }

  const profiles = await ctx.db
    .query('user_discogs_profile')
    .withIndex('by_username', (q) => q.eq('username', discogsUsername))
    .collect();
  for (const profile of profiles) {
    if (ctx.db.normalizeId('users', profile.user_id)) continue;
    const legacyUser =
      (await ctx.db
        .query('users')
        .withIndex('by_supabase_id', (q) =>
          q.eq('supabaseUserId', profile.user_id),
        )
        .first()) ??
      (await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', profile.user_id))
        .first());
    if (legacyUser) candidates.push(legacyUser._id);
  }

  for (const userId of candidates) {
    const existingSignIn = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) =>
        q.eq('userId', userId).eq('provider', DISCOGS_AUTH_PROVIDER),
      )
      .first();
    if (!existingSignIn) return userId;
  }
  return null;
}

/** Convex Auth `createOrUpdateUser` callback: link or create the user. */
export async function createOrUpdateDiscogsUser(
  ctx: MutationCtx,
  args: {
    existingUserId: GenericId<'users'> | null;
    provider: { id: string };
    profile: Record<string, unknown>;
  },
): Promise<Id<'users'>> {
  if (args.existingUserId) {
    return args.existingUserId as Id<'users'>;
  }
  if (args.provider.id !== DISCOGS_AUTH_PROVIDER) {
    throw new Error(`Unsupported sign-in provider: ${args.provider.id}`);
  }

  const profile = args.profile as unknown as DiscogsProfile;
  const linkedUserId = await findUserForDiscogsAccount(ctx, profile);
  if (linkedUserId) {
    const linked = await ctx.db.get(linkedUserId);
    if (linked && !linked.avatarUrl && profile.avatarUrl) {
      await ctx.db.patch(linkedUserId, { avatarUrl: profile.avatarUrl });
    }
    return linkedUserId;
  }

  // New user: onboarding asks for a Crate username, suggesting the Discogs one.
  return await ctx.db.insert('users', {
    displayName: profile.discogsUsername,
    avatarUrl: profile.avatarUrl,
    onboardingComplete: false,
    onboardingStep: 'username',
  });
}
