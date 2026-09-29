import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { internal } from '@/convex/_generated/api';
import schema from '@/convex/schema';
import * as users from '@/convex/users';

const modules = import.meta.glob('../../convex/**/*.*s');

type Registered = { isPublic?: boolean; isInternal?: boolean };

describe('account linking access', () => {
  // Owning a Supabase ID means owning that account's playlists and
  // collection, so nothing that sets or reveals one may be callable from the
  // app. This list is every users function a browser can call.
  it('exposes only the signed-in user flows from users.ts', () => {
    const publicFunctions = Object.entries(users)
      .filter(([, fn]) => (fn as Registered).isPublic)
      .map(([name]) => name)
      .sort();

    expect(publicFunctions).toEqual([
      'checkUsernameAvailable',
      'completeOnboarding',
      'getCurrentUser',
      'getDiscogsProfile',
      'removeDiscogsProfile',
      'setUsername',
      'updateOnboardingStep',
      'updateProfile',
    ]);
  });

  it.each([
    'adminLinkSupabaseId',
    'linkSupabaseUserId',
    'tryAutoLinkLegacyData',
    'getLegacyDataStats',
    'getUserByUsername',
  ] as const)('keeps %s internal', (name) => {
    expect((users[name] as Registered).isInternal).toBe(true);
  });

  it('still lets an admin link a Supabase ID from the CLI', async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => {
      await ctx.db.insert('user_releases', {
        user_id: 'legacy-owner',
        discogs_release_id: '1',
      });
      return await ctx.db.insert('users', { username: 'owner' });
    });

    await t.mutation(internal.users.adminLinkSupabaseId, {
      convexUserId: userId,
      supabaseUserId: 'legacy-owner',
    });

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.supabaseUserId).toBe('legacy-owner');
  });
});
