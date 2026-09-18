import { convexAuth } from '@convex-dev/auth/server';
import type { MutationCtx } from './_generated/server';
import { DiscogsSignIn, createOrUpdateDiscogsUser } from './discogsAuth';

/**
 * Crate accounts are Discogs accounts: "Continue with Discogs" is the only
 * sign-in (see discogsAuth.ts).
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [DiscogsSignIn],
  callbacks: {
    createOrUpdateUser: (ctx, args) =>
      // Convex Auth types ctx over a generic data model; it is this app's.
      createOrUpdateDiscogsUser(ctx as unknown as MutationCtx, args),
  },
});
