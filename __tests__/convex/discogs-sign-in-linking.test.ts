import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { internal } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { MutationCtx } from '@/convex/_generated/server';
import {
  createOrUpdateDiscogsUser,
  findUserForDiscogsAccount,
} from '@/convex/discogsAuth';
import { fetchDiscogsVerifiedEmail } from '@/convex/lib/discogsClient';
import schema from '@/convex/schema';

const modules = import.meta.glob('../../convex/**/*.*s');
type TestContext = ReturnType<typeof convexTest>;

const DISCOGS = {
  discogsUserId: '2510467',
  discogsUsername: 'gmohan218',
  email: 'gov@example.com',
};

/** Someone who signed up with an email code before Discogs sign-in existed. */
async function seedEmailCodeUser(
  t: TestContext,
  values: { email: string; verified?: boolean; username?: string },
) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {
      email: values.email,
      username: values.username,
      ...(values.verified === false
        ? {}
        : { emailVerificationTime: Date.UTC(2025, 11, 17) }),
    });
    await ctx.db.insert('authAccounts', {
      userId,
      provider: 'resend-otp',
      providerAccountId: values.email,
    });
    return userId;
  });
}

function find(
  t: TestContext,
  profile: Parameters<typeof findUserForDiscogsAccount>[1],
) {
  return t.run((ctx) =>
    findUserForDiscogsAccount(ctx as unknown as MutationCtx, profile),
  );
}

describe('linking a Discogs sign-in to an existing account', () => {
  it('links to the account whose verified email Discogs confirmed', async () => {
    const t = convexTest(schema, modules);
    const existingId = await seedEmailCodeUser(t, { email: 'gov@example.com' });

    expect(await find(t, DISCOGS)).toBe(existingId);
  });

  it('opens that account instead of creating a second one', async () => {
    const t = convexTest(schema, modules);
    const existingId = await seedEmailCodeUser(t, {
      email: 'gov@example.com',
      username: 'demux',
    });

    const signedIn = await t.run((ctx) =>
      createOrUpdateDiscogsUser(ctx as unknown as MutationCtx, {
        existingUserId: null,
        provider: { id: 'discogs' },
        profile: { ...DISCOGS },
      }),
    );

    expect(signedIn).toBe(existingId);
    expect(await t.run((ctx) => ctx.db.query('users').collect())).toHaveLength(
      1,
    );
  });

  it('does not link on an email the account never verified', async () => {
    const t = convexTest(schema, modules);
    await seedEmailCodeUser(t, { email: 'gov@example.com', verified: false });

    expect(await find(t, DISCOGS)).toBeNull();
  });

  it('does not guess when two verified accounts share the email', async () => {
    const t = convexTest(schema, modules);
    await seedEmailCodeUser(t, { email: 'gov@example.com' });
    await seedEmailCodeUser(t, { email: 'gov@example.com' });

    expect(await find(t, DISCOGS)).toBeNull();
  });

  it('skips an account that already signs in with another Discogs user', async () => {
    const t = convexTest(schema, modules);
    const existingId = await seedEmailCodeUser(t, { email: 'gov@example.com' });
    await t.run((ctx) =>
      ctx.db.insert('authAccounts', {
        userId: existingId,
        provider: 'discogs',
        providerAccountId: '999',
      }),
    );

    expect(await find(t, DISCOGS)).toBeNull();
  });

  it('creates a new account when Discogs shares no email', async () => {
    const t = convexTest(schema, modules);
    await seedEmailCodeUser(t, { email: 'gov@example.com' });

    expect(
      await find(t, { discogsUserId: '2510467', discogsUsername: 'gmohan218' }),
    ).toBeNull();
  });
});

describe('fetchDiscogsVerifiedEmail', () => {
  const credentials = { accessToken: 'token', accessTokenSecret: 'secret' };

  beforeEach(() => {
    vi.stubEnv('DISCOGS_CONSUMER_KEY', 'key');
    vi.stubEnv('DISCOGS_CONSUMER_SECRET', 'secret');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function discogsReturns(response: Response) {
    const fetchMock = vi.fn(async () => response);
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('reads the email with the user’s own tokens', async () => {
    const fetchMock = discogsReturns(
      Response.json({ email: ' Gov@Example.com ', activated: true }),
    );

    expect(await fetchDiscogsVerifiedEmail(credentials, 'gmohan218')).toBe(
      'gov@example.com',
    );
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(String(url)).toContain('/users/gmohan218');
    expect(new Headers(init.headers).get('Authorization')).toContain(
      'oauth_token="token"',
    );
  });

  it('ignores an account Discogs has not activated', async () => {
    discogsReturns(
      Response.json({ email: 'gov@example.com', activated: false }),
    );

    expect(
      await fetchDiscogsVerifiedEmail(credentials, 'gmohan218'),
    ).toBeUndefined();
  });

  it('lets sign-in go on when Discogs fails', async () => {
    discogsReturns(new Response('Forbidden', { status: 403 }));

    expect(
      await fetchDiscogsVerifiedEmail(credentials, 'gmohan218'),
    ).toBeUndefined();
  });
});

describe('merging an account that has no username yet', () => {
  it('takes the new Discogs account by user ID', async () => {
    const t = convexTest(schema, modules);
    const keepId = await seedEmailCodeUser(t, {
      email: 'gov@example.com',
      username: 'demux',
    });
    const mergeId: Id<'users'> = await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {
        displayName: 'gmohan218',
        onboardingStep: 'username',
      });
      await ctx.db.insert('authAccounts', {
        userId,
        provider: 'discogs',
        providerAccountId: '2510467',
      });
      return userId;
    });

    const dryRun = await t.mutation(internal.admin.mergeAccounts, {
      keepUsername: 'demux',
      mergeUsername: mergeId,
      dryRun: true,
    });
    expect(dryRun).toMatchObject({
      keep: 'demux',
      merge: mergeId,
      signInMethods: ['discogs'],
    });

    await t.mutation(internal.admin.mergeAccounts, {
      keepUsername: 'demux',
      mergeUsername: mergeId,
    });

    const accounts = await t.run((ctx) =>
      ctx.db.query('authAccounts').collect(),
    );
    expect(
      accounts.map((account) => [account.provider, account.userId]),
    ).toEqual([
      ['resend-otp', keepId],
      ['discogs', keepId],
    ]);
    expect(await t.run((ctx) => ctx.db.get(mergeId))).toBeNull();
  });
});
