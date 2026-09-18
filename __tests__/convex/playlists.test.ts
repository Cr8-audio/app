import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import schema from '@/convex/schema';

const modules = import.meta.glob('../../convex/**/*.*s');
type TestContext = ReturnType<typeof convexTest>;

async function seedUser(
  t: TestContext,
  values: {
    email: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    supabaseUserId?: string;
  },
) {
  return await t.run(async (ctx) => await ctx.db.insert('users', values));
}

async function seedTrack(
  t: TestContext,
  values: {
    id: string;
    title: string;
    position: string;
    artwork?: string;
  },
) {
  return await t.run(async (ctx) =>
    ctx.db.insert('tracks', {
      id: values.id,
      discogs_release_id: 'release-1',
      youtube_video_id: `youtube-${values.id}`,
      title: values.title,
      artist: 'Test Artist',
      position: values.position,
      duration: '3:30',
      artwork: values.artwork,
    }),
  );
}

describe('playlist queries and mutations', () => {
  it('returns only the safe projection for a legacy public playlist', async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, {
      email: 'owner@example.com',
      username: 'owner',
      displayName: 'Playlist Owner',
      avatarUrl: 'https://example.com/avatar.jpg',
      supabaseUserId: 'legacy-owner-id',
    });
    const trackId = await seedTrack(t, {
      id: 'track-1',
      title: 'First Track',
      position: 'A1',
    });
    const playlistId = await t.run(async (ctx) => {
      const id = await ctx.db.insert('playlists', {
        id: 'public-playlist-id',
        user_id: 'owner@example.com',
        title: 'Public Set',
        description: 'A public description',
        is_public: 't',
        is_favorites: 'f',
      });
      await ctx.db.insert('playlist_tracks', {
        id: 'playlist-track-1',
        playlist_id: id,
        track_id: trackId,
        position: 7,
      });
      return id;
    });

    const result = await t.query(api.playlists.getPublicPlaylist, {
      publicId: 'public-playlist-id',
    });

    expect(result).toMatchObject({
      publicId: 'public-playlist-id',
      title: 'Public Set',
      owner: {
        username: 'owner',
        displayName: 'Playlist Owner',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      tracks: [
        {
          id: 'track-1',
          title: 'First Track',
          position: 'A1',
          playlistPosition: 7,
        },
      ],
    });
    expect(result?.owner).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('user_id');
    expect(result).not.toHaveProperty('_id');
    expect(result?.tracks[0]).not.toHaveProperty('_id');

    // The variables are deliberately used to document that neither internal
    // Convex identifier is returned by the public query.
    expect(result?.publicId).not.toBe(playlistId);
    expect(result?.owner).not.toHaveProperty('_id', ownerId);
  });

  it.each([false, 'f', 'false', undefined])(
    'does not expose a playlist with visibility %s',
    async (visibility) => {
      const t = convexTest(schema, modules);
      await seedUser(t, {
        email: 'owner@example.com',
        username: 'owner',
      });
      await t.run(async (ctx) => {
        await ctx.db.insert('playlists', {
          id: 'private-playlist-id',
          user_id: 'owner@example.com',
          title: 'Private Set',
          ...(visibility === undefined ? {} : { is_public: visibility }),
        });
      });

      await expect(
        t.query(api.playlists.getPublicPlaylist, {
          publicId: 'private-playlist-id',
        }),
      ).resolves.toBeNull();
    },
  );

  it('lists safe public summaries across all legacy owner identifiers', async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, {
      email: 'owner@example.com',
      username: 'owner',
      displayName: 'Playlist Owner',
      avatarUrl: 'https://example.com/avatar.jpg',
      supabaseUserId: 'legacy-owner-id',
    });
    const firstTrackId = await seedTrack(t, {
      id: 'track-1',
      title: 'First',
      position: 'A1',
      artwork: 'https://example.com/first.jpg',
    });
    const secondTrackId = await seedTrack(t, {
      id: 'track-2',
      title: 'Second',
      position: 'A2',
      artwork: 'https://example.com/second.jpg',
    });

    await t.run(async (ctx) => {
      const emailPlaylistId = await ctx.db.insert('playlists', {
        id: 'email-public',
        user_id: 'owner@example.com',
        title: 'Email Public',
        description: 'From the email-era records',
        is_public: true,
        updated_at: '2026-09-18T10:00:00.000Z',
      });
      await ctx.db.insert('playlist_tracks', {
        id: 'email-join-1',
        playlist_id: emailPlaylistId,
        track_id: firstTrackId,
        position: 0,
      });
      await ctx.db.insert('playlist_tracks', {
        id: 'email-join-2',
        playlist_id: emailPlaylistId,
        track_id: secondTrackId,
        position: 1,
      });

      await ctx.db.insert('playlists', {
        id: 'legacy-public',
        user_id: 'legacy-owner-id',
        title: 'Legacy Public',
        is_public: 't',
        updated_at: '2026-09-18T09:00:00.000Z',
      });
      await ctx.db.insert('playlists', {
        id: 'native-public',
        user_id: ownerId,
        title: 'Native Public',
        is_public: true,
        updated_at: '2026-09-18T08:00:00.000Z',
      });
      await ctx.db.insert('playlists', {
        id: 'private-playlist',
        user_id: 'owner@example.com',
        title: 'Private',
        is_public: 'f',
      });
      await ctx.db.insert('playlists', {
        id: 'public-favorites',
        user_id: 'owner@example.com',
        title: 'Favorites',
        is_public: true,
        is_favorites: 't',
      });
    });

    const result = await t.query(api.playlists.getPublicPlaylistsByUsername, {
      username: 'OWNER',
    });

    expect(result).toEqual({
      owner: {
        username: 'owner',
        displayName: 'Playlist Owner',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      playlists: [
        {
          publicId: 'email-public',
          title: 'Email Public',
          description: 'From the email-era records',
          coverImageUrl: null,
          trackCount: 2,
          artworkUrls: [
            'https://example.com/first.jpg',
            'https://example.com/second.jpg',
          ],
        },
        {
          publicId: 'legacy-public',
          title: 'Legacy Public',
          description: null,
          coverImageUrl: null,
          trackCount: 0,
          artworkUrls: [],
        },
        {
          publicId: 'native-public',
          title: 'Native Public',
          description: null,
          coverImageUrl: null,
          trackCount: 0,
          artworkUrls: [],
        },
      ],
    });
    expect(result?.owner).not.toHaveProperty('email');
    expect(result?.playlists).toHaveLength(3);

    const ownedPlaylists = await t
      .withIdentity({ subject: ownerId })
      .query(api.playlists.getUserPlaylists);
    expect(ownedPlaylists.map((playlist) => playlist.id).sort()).toEqual([
      'email-public',
      'legacy-public',
      'native-public',
      'private-playlist',
      'public-favorites',
    ]);
  });

  it('keeps existing playlist queries owner-only', async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, {
      email: 'owner@example.com',
      username: 'owner',
    });
    const otherUserId = await seedUser(t, {
      email: 'other@example.com',
      username: 'other',
    });
    const playlistId = await t.run(async (ctx) =>
      ctx.db.insert('playlists', {
        id: 'owner-only-id',
        user_id: 'owner@example.com',
        title: 'Owner Only',
        is_public: true,
      }),
    );

    await expect(
      t.query(api.playlists.getPlaylist, { playlistId }),
    ).resolves.toBeNull();
    await expect(
      t
        .withIdentity({ subject: otherUserId })
        .query(api.playlists.getPlaylist, { playlistId }),
    ).resolves.toBeNull();
    await expect(
      t
        .withIdentity({ subject: otherUserId })
        .query(api.playlists.getPlaylistByOldId, {
          oldId: 'owner-only-id',
        }),
    ).resolves.toBeNull();

    const ownerResult = await t
      .withIdentity({ subject: ownerId })
      .query(api.playlists.getPlaylist, { playlistId });
    expect(ownerResult?.title).toBe('Owner Only');
  });

  it('returns the Convex playlist ID from createPlaylist', async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, {
      email: 'owner@example.com',
      username: 'owner',
    });

    const result = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.playlists.createPlaylist, { title: 'New Playlist' });

    const stored = await t.run(async (ctx) => ctx.db.get(result.playlistId));
    expect(stored?.title).toBe('New Playlist');
    expect(result.playlistId).toBe(stored?._id);
    expect(result.playlistId).not.toBe(stored?.id);
  });

  it('reorders every playlist track and preserves Discogs positions', async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, {
      email: 'owner@example.com',
      username: 'owner',
    });
    const firstTrackId = await seedTrack(t, {
      id: 'track-1',
      title: 'First',
      position: 'A1',
    });
    const secondTrackId = await seedTrack(t, {
      id: 'track-2',
      title: 'Second',
      position: 'B1',
    });
    const playlistId = await t.run(async (ctx) => {
      const id = await ctx.db.insert('playlists', {
        id: 'ordered-playlist-id',
        user_id: 'owner@example.com',
        title: 'Ordered Playlist',
      });
      await ctx.db.insert('playlist_tracks', {
        id: 'join-1',
        playlist_id: id,
        track_id: firstTrackId,
        position: 0,
      });
      await ctx.db.insert('playlist_tracks', {
        id: 'join-2',
        playlist_id: id,
        track_id: secondTrackId,
        position: 1,
      });
      return id;
    });

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.playlists.reorderPlaylistTracks, {
        playlistId,
        trackIds: [secondTrackId, firstTrackId],
      });

    const result = await t
      .withIdentity({ subject: ownerId })
      .query(api.playlists.getPlaylist, { playlistId });
    expect(
      result?.tracks.map((track) => ({
        id: track.id,
        discogsPosition: track.position,
        playlistPosition: track.playlistPosition,
      })),
    ).toEqual([
      { id: 'track-2', discogsPosition: 'B1', playlistPosition: 0 },
      { id: 'track-1', discogsPosition: 'A1', playlistPosition: 1 },
    ]);
  });

  it('rejects non-owner and incomplete reorder requests', async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, {
      email: 'owner@example.com',
      username: 'owner',
    });
    const otherUserId = await seedUser(t, {
      email: 'other@example.com',
      username: 'other',
    });
    const trackId = await seedTrack(t, {
      id: 'track-1',
      title: 'First',
      position: 'A1',
    });
    const playlistId = await t.run(async (ctx) => {
      const id = await ctx.db.insert('playlists', {
        id: 'protected-playlist-id',
        user_id: 'owner@example.com',
        title: 'Protected Playlist',
      });
      await ctx.db.insert('playlist_tracks', {
        id: 'join-1',
        playlist_id: id,
        track_id: trackId,
        position: 0,
      });
      return id;
    });

    await expect(
      t
        .withIdentity({ subject: otherUserId })
        .mutation(api.playlists.reorderPlaylistTracks, {
          playlistId,
          trackIds: [trackId],
        }),
    ).rejects.toThrow('Not authorized');

    const ownerId = await t.run(async (ctx) => {
      const owner = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', 'owner@example.com'))
        .first();
      return owner?._id as Id<'users'>;
    });
    await expect(
      t
        .withIdentity({ subject: ownerId })
        .mutation(api.playlists.reorderPlaylistTracks, {
          playlistId,
          trackIds: [],
        }),
    ).rejects.toThrow('Track order must contain every playlist track once');
  });
});
