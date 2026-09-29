import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api, internal } from '@/convex/_generated/api';
import schema from '@/convex/schema';

const modules = import.meta.glob('../../convex/**/*.*s');
type TestContext = ReturnType<typeof convexTest>;

/**
 * The production shape: `paprika` was migrated from Supabase and owns the
 * playlists and collection; Discogs sign-in created `baston2rue` for the same
 * person, with the Discogs login, the connection and one favorite.
 */
async function seedSamePersonTwice(t: TestContext) {
  return await t.run(async (ctx) => {
    const keepId = await ctx.db.insert('users', {
      username: 'paprika',
      email: 'me@example.com',
      supabaseUserId: 'legacy-id',
      onboardingComplete: true,
    });
    const mergeId = await ctx.db.insert('users', {
      username: 'baston2rue',
      avatarUrl: 'https://example.com/discogs-avatar.jpg',
    });

    const track = (title: string) =>
      ctx.db.insert('tracks', {
        id: title,
        discogs_release_id: '1',
        title,
        artist: 'Miss Kittin & The Hacker',
        position: 'A1',
        duration: '',
      });
    const kept = await track('Frank Sinatra');
    const both = await track('1982');
    const onlyMerge = await track('1000 Dreams Reprise');

    const keepFavorites = await ctx.db.insert('playlists', {
      id: 'keep-favorites',
      user_id: 'me@example.com',
      title: 'Favorites',
      is_favorites: true,
    });
    for (const [position, trackId] of [kept, both].entries()) {
      await ctx.db.insert('playlist_tracks', {
        id: `keep-${position}`,
        playlist_id: keepFavorites,
        track_id: trackId,
        position,
      });
    }
    await ctx.db.insert('playlists', {
      id: 'ai-mix',
      user_id: 'legacy-id',
      title: 'AI Mix',
      visibility: 'public',
      share_id: 'AIMIXLINK123',
    });
    const mergeFavorites = await ctx.db.insert('playlists', {
      id: 'merge-favorites',
      user_id: mergeId,
      title: 'Favorites',
      is_favorites: true,
    });
    for (const [position, trackId] of [both, onlyMerge].entries()) {
      await ctx.db.insert('playlist_tracks', {
        id: `merge-${position}`,
        playlist_id: mergeFavorites,
        track_id: trackId,
        position,
      });
    }

    for (const releaseId of ['1', '2']) {
      await ctx.db.insert('user_releases', {
        user_id: 'legacy-id',
        discogs_release_id: releaseId,
      });
    }
    for (const releaseId of ['1', '2', '3']) {
      await ctx.db.insert('user_releases', {
        user_id: mergeId,
        discogs_release_id: releaseId,
      });
    }

    await ctx.db.insert('authAccounts', {
      userId: keepId,
      provider: 'resend-otp',
      providerAccountId: 'me@example.com',
    });
    const discogsAccount = await ctx.db.insert('authAccounts', {
      userId: mergeId,
      provider: 'discogs',
      providerAccountId: '6652785',
    });
    await ctx.db.insert('user_music_connections', {
      userId: mergeId,
      provider: 'discogs',
      accessToken: 'token',
      accessTokenSecret: 'secret',
      providerUserId: '6652785',
      providerUsername: 'Baston2rue',
    });
    await ctx.db.insert('user_discogs_profile', {
      username: 'Baston2rue',
      user_id: mergeId,
    });
    const session = await ctx.db.insert('authSessions', {
      userId: mergeId,
      expirationTime: Date.now() + 1000,
    });
    await ctx.db.insert('authRefreshTokens', {
      sessionId: session,
      expirationTime: Date.now() + 1000,
    });

    return { keepId, mergeId, discogsAccount };
  });
}

const merge = {
  keepUsername: 'paprika',
  mergeUsername: 'baston2rue',
};

describe('merging two accounts of the same person', () => {
  it('reports the merge without changing anything on a dry run', async () => {
    const t = convexTest(schema, modules);
    const { mergeId } = await seedSamePersonTwice(t);

    const report = await t.mutation(internal.admin.mergeAccounts, {
      ...merge,
      dryRun: true,
    });

    expect(report).toEqual({
      dryRun: true,
      keep: 'paprika',
      merge: 'baston2rue',
      signInMethods: ['discogs'],
      connections: ['discogs'],
      playlistsMoved: [],
      favoritesAdded: 1,
      releasesAdded: 1,
      releaseRowsRemoved: 3,
      sessionsEnded: 1,
    });
    await expect(t.run((ctx) => ctx.db.get(mergeId))).resolves.not.toBeNull();
  });

  it('signs Discogs into the kept account and folds everything into it', async () => {
    const t = convexTest(schema, modules);
    const { keepId, mergeId, discogsAccount } = await seedSamePersonTwice(t);

    await t.mutation(internal.admin.mergeAccounts, merge);

    const state = await t.run(async (ctx) => ({
      mergeUser: await ctx.db.get(mergeId),
      keepUser: await ctx.db.get(keepId),
      discogsAccount: await ctx.db.get(discogsAccount),
      connections: await ctx.db.query('user_music_connections').collect(),
      sessions: await ctx.db.query('authSessions').collect(),
      refreshTokens: await ctx.db.query('authRefreshTokens').collect(),
      profiles: await ctx.db.query('user_discogs_profile').collect(),
      releases: await ctx.db.query('user_releases').collect(),
    }));

    expect(state.mergeUser).toBeNull();
    // Discogs sign-in now resolves to paprika.
    expect(state.discogsAccount?.userId).toBe(keepId);
    expect(state.connections.map((c) => c.userId)).toEqual([keepId]);
    expect(state.sessions).toEqual([]);
    expect(state.refreshTokens).toEqual([]);
    expect(state.profiles).toEqual([]);
    expect(state.keepUser?.avatarUrl).toBe(
      'https://example.com/discogs-avatar.jpg',
    );
    // The collection is the union, under paprika's existing key.
    expect(
      state.releases
        .map((row) => `${row.user_id}:${row.discogs_release_id}`)
        .sort(),
    ).toEqual(['legacy-id:1', 'legacy-id:2', 'legacy-id:3']);

    const playlists = await t
      .withIdentity({ subject: keepId })
      .query(api.playlists.getUserPlaylists);
    expect(playlists.map((playlist) => playlist.title).sort()).toEqual([
      'AI Mix',
      'Favorites',
    ]);
    const favorites = playlists.find((playlist) => playlist.is_favorites);
    expect(favorites?.tracks.map((track) => track.title)).toEqual([
      'Frank Sinatra',
      '1982',
      '1000 Dreams Reprise',
    ]);
    await expect(
      t.query(api.playlists.getPublicPlaylist, { publicId: 'AIMIXLINK123' }),
    ).resolves.toMatchObject({ owner: { username: 'paprika' } });
  });

  it('refuses when both accounts sign in with the same provider', async () => {
    const t = convexTest(schema, modules);
    const { keepId } = await seedSamePersonTwice(t);
    await t.run((ctx) =>
      ctx.db.insert('authAccounts', {
        userId: keepId,
        provider: 'discogs',
        providerAccountId: 'another-discogs-user',
      }),
    );

    await expect(
      t.mutation(internal.admin.mergeAccounts, merge),
    ).rejects.toThrow('Both accounts sign in with discogs');
  });

  it('refuses unknown or identical accounts', async () => {
    const t = convexTest(schema, modules);
    await seedSamePersonTwice(t);

    await expect(
      t.mutation(internal.admin.mergeAccounts, {
        keepUsername: 'paprika',
        mergeUsername: 'nobody',
      }),
    ).rejects.toThrow('No user named nobody');
    await expect(
      t.mutation(internal.admin.mergeAccounts, {
        keepUsername: 'paprika',
        mergeUsername: 'paprika',
      }),
    ).rejects.toThrow('Pick two different accounts');
  });
});
