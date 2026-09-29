import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api, internal } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import schema from '@/convex/schema';

const modules = import.meta.glob('../../convex/**/*.*s');
type TestContext = ReturnType<typeof convexTest>;

/**
 * The production shape: a migrated account that owns playlists under its
 * email and Supabase ID, and a Discogs sign-in account with only Favorites.
 */
async function seedTwoAccounts(t: TestContext) {
  return await t.run(async (ctx) => {
    const migratedId = await ctx.db.insert('users', {
      username: 'paprika',
      email: 'me@example.com',
      supabaseUserId: 'legacy-id',
    });
    const discogsId = await ctx.db.insert('users', { username: 'baston2rue' });

    const track = (title: string) =>
      ctx.db.insert('tracks', {
        id: title,
        discogs_release_id: 'release-1',
        title,
        artist: 'Mandar',
        position: 'A1',
        duration: '',
      });
    const [a, b, c] = [
      await track('Poisoned Words'),
      await track('Double Existence'),
      await track('Grumax'),
    ];

    const playlist = async (
      userId: string,
      title: string,
      trackIds: Id<'tracks'>[],
      extra: Record<string, unknown> = {},
    ) => {
      const playlistId = await ctx.db.insert('playlists', {
        id: `${title}-uuid`,
        user_id: userId,
        title,
        ...extra,
      });
      for (const [position, trackId] of trackIds.entries()) {
        await ctx.db.insert('playlist_tracks', {
          id: `${title}-${position}`,
          playlist_id: playlistId,
          track_id: trackId,
          position,
        });
      }
      return playlistId;
    };

    const shared = await playlist('legacy-id', 'AI Mix', [a, b], {
      visibility: 'public',
      share_id: 'AIMIXLINK123',
    });
    const privateMix = await playlist('me@example.com', 'rager', [c]);
    await playlist('legacy-id', 'Favorites', [a, b], { is_favorites: true });
    await playlist('me@example.com', 'Favorites', [b, c], {
      is_favorites: true,
    });
    const targetFavorites = await playlist(discogsId, 'Favorites', [a], {
      is_favorites: true,
    });

    return { migratedId, discogsId, shared, privateMix, targetFavorites };
  });
}

describe('transferring playlists between accounts', () => {
  it('reports what would move without changing anything on a dry run', async () => {
    const t = convexTest(schema, modules);
    const { discogsId } = await seedTwoAccounts(t);

    const report = await t.mutation(internal.admin.transferPlaylists, {
      fromUsername: 'paprika',
      toUsername: 'baston2rue',
      dryRun: true,
    });

    expect(report).toMatchObject({
      dryRun: true,
      favoritesAdded: 2,
      favoritesAlreadyThere: 1,
    });
    expect(report.moved).toEqual(
      expect.arrayContaining([
        { title: 'AI Mix', visibility: 'public', shareId: 'AIMIXLINK123' },
        { title: 'rager', visibility: 'private', shareId: null },
      ]),
    );
    expect(report.moved).toHaveLength(2);
    const owned = await t
      .withIdentity({ subject: discogsId })
      .query(api.playlists.getUserPlaylists);
    expect(owned.map((playlist) => playlist.title)).toEqual(['Favorites']);
  });

  it('moves playlists, keeps share links and merges favorites', async () => {
    const t = convexTest(schema, modules);
    const { discogsId, migratedId } = await seedTwoAccounts(t);

    await t.mutation(internal.admin.transferPlaylists, {
      fromUsername: 'paprika',
      toUsername: 'baston2rue',
    });

    const owned = await t
      .withIdentity({ subject: discogsId })
      .query(api.playlists.getUserPlaylists);
    expect(owned.map((playlist) => playlist.title).sort()).toEqual([
      'AI Mix',
      'Favorites',
      'rager',
    ]);
    const favorites = owned.find((playlist) => playlist.is_favorites);
    expect(favorites?.tracks.map((track) => track.title)).toEqual([
      'Poisoned Words',
      'Double Existence',
      'Grumax',
    ]);

    // The public link still works and now credits the new account.
    const shared = await t.query(api.playlists.getPublicPlaylist, {
      publicId: 'AIMIXLINK123',
    });
    expect(shared?.owner?.username).toBe('baston2rue');
    const shelf = await t.query(api.playlists.getPublicPlaylistsByUsername, {
      username: 'baston2rue',
    });
    expect(shelf?.playlists.map((playlist) => playlist.title)).toEqual([
      'AI Mix',
    ]);

    // The migrated account keeps only its own Favorites, untouched.
    const left = await t
      .withIdentity({ subject: migratedId })
      .query(api.playlists.getUserPlaylists);
    expect(left.map((playlist) => playlist.title)).toEqual([
      'Favorites',
      'Favorites',
    ]);
  });

  it('refuses unknown or identical accounts', async () => {
    const t = convexTest(schema, modules);
    await seedTwoAccounts(t);

    await expect(
      t.mutation(internal.admin.transferPlaylists, {
        fromUsername: 'nobody',
        toUsername: 'baston2rue',
      }),
    ).rejects.toThrow('No user named nobody');
    await expect(
      t.mutation(internal.admin.transferPlaylists, {
        fromUsername: 'paprika',
        toUsername: 'paprika',
      }),
    ).rejects.toThrow('Pick two different accounts');
  });
});
