import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import schema from '@/convex/schema';

const modules = import.meta.glob('../../convex/**/*.*s');
type TestContext = ReturnType<typeof convexTest>;

/**
 * The production shape: a migrated user whose Favorites exist twice, once
 * under the Supabase ID (from the migration) and once under their email
 * (created later, when favorites couldn't see the first one).
 */
async function seed(t: TestContext) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {
      username: 'paprika',
      email: 'me@example.com',
      supabaseUserId: 'legacy-id',
    });
    const track = (title: string) =>
      ctx.db.insert('tracks', {
        id: `old-${title}`,
        discogs_release_id: '1',
        title,
        artist: 'Akufen',
        position: 'A1',
        duration: '',
      });
    const tracks = {
      deck: await track('Deck The House'),
      jeep: await track('Jeep Sex'),
      skidoos: await track('Skidoos'),
      other: await track('Heaven Can Wait'),
    };
    const favorites = async (
      owner: string,
      trackIds: Id<'tracks'>[],
    ): Promise<Id<'playlists'>> => {
      const playlistId = await ctx.db.insert('playlists', {
        id: `favorites-${owner}`,
        user_id: owner,
        title: 'Favorites',
        is_favorites: owner === 'legacy-id' ? 't' : true,
      });
      for (const [position, trackId] of trackIds.entries()) {
        await ctx.db.insert('playlist_tracks', {
          id: `${owner}-${position}`,
          playlist_id: playlistId,
          track_id: trackId,
          position,
        });
      }
      return playlistId;
    };
    const emailFavorites = await favorites('me@example.com', [
      tracks.deck,
      tracks.jeep,
    ]);
    const legacyFavorites = await favorites('legacy-id', [
      tracks.jeep,
      tracks.skidoos,
    ]);
    // Someone else's favorites must never show up.
    await favorites('someone@example.com', [tracks.other]);
    return { userId, tracks, emailFavorites, legacyFavorites };
  });
}

async function playlistOwners(t: TestContext) {
  return (await t.run((ctx) => ctx.db.query('playlists').collect())).map(
    (playlist) => playlist.user_id,
  );
}

describe('favorites', () => {
  it('reads every Favorites list the user owns as one, without repeats', async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seed(t);

    const { favoriteTrackIds, favorites } = await t
      .withIdentity({ subject: userId })
      .query(api.favorites.getFavorites, {});

    expect(favoriteTrackIds).toEqual([
      'old-Deck The House',
      'old-Jeep Sex',
      'old-Skidoos',
    ]);
    expect(favorites.map((favorite) => favorite.tracks.title)).toEqual([
      'Deck The House',
      'Jeep Sex',
      'Skidoos',
    ]);
  });

  it('adds to the existing list instead of starting another', async () => {
    const t = convexTest(schema, modules);
    const { userId, tracks, emailFavorites } = await seed(t);
    const before = await playlistOwners(t);

    await t
      .withIdentity({ subject: userId })
      .mutation(api.favorites.addFavorite, { trackId: 'old-Heaven Can Wait' });

    expect(await playlistOwners(t)).toEqual(before);
    const added = await t.run((ctx) =>
      ctx.db
        .query('playlist_tracks')
        .withIndex('by_playlist_track', (q) =>
          q.eq('playlist_id', emailFavorites).eq('track_id', tracks.other),
        )
        .first(),
    );
    expect(added?.position).toBe(2);
  });

  it('writes to a migrated list when that is the only one', async () => {
    const t = convexTest(schema, modules);
    const { userId, tracks, emailFavorites, legacyFavorites } = await seed(t);
    await t.run(async (ctx) => {
      for (const row of await ctx.db
        .query('playlist_tracks')
        .withIndex('by_playlist_position', (q) =>
          q.eq('playlist_id', emailFavorites),
        )
        .collect()) {
        await ctx.db.delete(row._id);
      }
      await ctx.db.delete(emailFavorites);
    });

    await t
      .withIdentity({ subject: userId })
      .mutation(api.favorites.addFavorite, { trackId: tracks.deck });

    const rows = await t.run((ctx) =>
      ctx.db
        .query('playlist_tracks')
        .withIndex('by_playlist_position', (q) =>
          q.eq('playlist_id', legacyFavorites),
        )
        .collect(),
    );
    expect(rows.map((row) => row.track_id)).toEqual([
      tracks.jeep,
      tracks.skidoos,
      tracks.deck,
    ]);
  });

  it('accepts a Convex track ID as well as the old one', async () => {
    const t = convexTest(schema, modules);
    const { userId, tracks } = await seed(t);
    const asUser = t.withIdentity({ subject: userId });

    expect(tracks.other.startsWith('j')).toBe(false);
    expect(
      await asUser.mutation(api.favorites.addFavorite, {
        trackId: tracks.other,
      }),
    ).toEqual({ success: true, message: 'Added to favorites' });
    expect(
      await asUser.mutation(api.favorites.addFavorite, {
        trackId: 'old-Heaven Can Wait',
      }),
    ).toEqual({ success: true, message: 'Track already in favorites' });
  });

  it('unfavorites a track from every list it is in', async () => {
    const t = convexTest(schema, modules);
    const { userId, tracks } = await seed(t);
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.favorites.removeFavorite, {
      trackId: 'old-Jeep Sex',
    });

    expect(
      await asUser.query(api.favorites.isFavorited, { trackId: tracks.jeep }),
    ).toBe(false);
    expect(
      (await asUser.query(api.favorites.getFavorites, {})).favoriteTrackIds,
    ).toEqual(['old-Deck The House', 'old-Skidoos']);
  });

  it('creates one list for a user with none', async () => {
    const t = convexTest(schema, modules);
    const { tracks } = await seed(t);
    const newUserId = await t.run((ctx) =>
      ctx.db.insert('users', { username: 'gov', email: 'gov@example.com' }),
    );
    const asNewUser = t.withIdentity({ subject: newUserId });

    await asNewUser.mutation(api.favorites.addFavorite, {
      trackId: tracks.deck,
    });
    await asNewUser.mutation(api.favorites.addFavorite, {
      trackId: tracks.jeep,
    });

    expect(
      (await playlistOwners(t)).filter((owner) => owner === 'gov@example.com'),
    ).toHaveLength(1);
    expect(
      (await asNewUser.query(api.favorites.getFavorites, {})).favoriteTrackIds,
    ).toEqual(['old-Deck The House', 'old-Jeep Sex']);
  });
});
