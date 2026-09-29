import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import schema from '@/convex/schema';

const modules = import.meta.glob('../../convex/**/*.*s');
type TestContext = ReturnType<typeof convexTest>;

async function seedOwnerWithPlaylist(
  t: TestContext,
  playlist: { is_public?: boolean; is_favorites?: boolean } = {},
) {
  return await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert('users', {
      email: 'owner@example.com',
      username: 'owner',
    });
    const trackId = await ctx.db.insert('tracks', {
      id: 'track-1',
      discogs_release_id: 'release-1',
      title: 'Deck The House',
      artist: 'Akufen',
      position: 'A1',
      duration: '6:10',
    });
    const playlistId = await ctx.db.insert('playlists', {
      id: 'legacy-uuid',
      user_id: 'owner@example.com',
      title: 'Warm-up',
      ...playlist,
    });
    await ctx.db.insert('playlist_tracks', {
      id: 'playlist-track-1',
      playlist_id: playlistId,
      track_id: trackId,
      position: 0,
    });
    return { ownerId, playlistId, trackId };
  });
}

function asUser(t: TestContext, userId: Id<'users'>) {
  return t.withIdentity({ subject: userId });
}

async function publicListing(t: TestContext) {
  const shelf = await t.query(api.playlists.getPublicPlaylistsByUsername, {
    username: 'owner',
  });
  return shelf?.playlists.map((playlist) => playlist.publicId) ?? [];
}

describe('sharing playlists', () => {
  // Hold scheduled audio matching so it doesn't run after a test ends.
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shares by link when unlisted and lists on the profile only when public', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, playlistId } = await seedOwnerWithPlaylist(t);
    const owner = asUser(t, ownerId);

    const { shareId } = await owner.mutation(
      api.playlists.setPlaylistVisibility,
      { playlistId, visibility: 'unlisted' },
    );
    expect(shareId).toMatch(/^[0-9A-Za-z]{12}$/);

    const unlisted = await t.query(api.playlists.getPublicPlaylist, {
      publicId: shareId!,
    });
    expect(unlisted).toMatchObject({
      publicId: shareId,
      visibility: 'unlisted',
      playMode: 'in_order',
    });
    expect(await publicListing(t)).toEqual([]);

    await owner.mutation(api.playlists.setPlaylistVisibility, {
      playlistId,
      visibility: 'public',
    });
    expect(await publicListing(t)).toEqual([shareId]);

    await owner.mutation(api.playlists.setPlaylistVisibility, {
      playlistId,
      visibility: 'private',
    });
    await expect(
      t.query(api.playlists.getPublicPlaylist, { publicId: shareId! }),
    ).resolves.toBeNull();
    expect(await publicListing(t)).toEqual([]);

    // Sharing again brings the same link back.
    const again = await owner.mutation(api.playlists.setPlaylistVisibility, {
      playlistId,
      visibility: 'unlisted',
    });
    expect(again.shareId).toBe(shareId);
  });

  it('stops the old link working after a reset', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, playlistId } = await seedOwnerWithPlaylist(t);
    const owner = asUser(t, ownerId);
    const { shareId: oldId } = await owner.mutation(
      api.playlists.setPlaylistVisibility,
      { playlistId, visibility: 'unlisted' },
    );

    const { shareId: newId } = await owner.mutation(
      api.playlists.resetPlaylistLink,
      { playlistId },
    );

    expect(newId).not.toBe(oldId);
    await expect(
      t.query(api.playlists.getPublicPlaylist, { publicId: oldId! }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.playlists.getPublicPlaylist, { publicId: newId }),
    ).resolves.toMatchObject({ publicId: newId });
  });

  it('keeps a legacy public link until the link is reset', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, playlistId } = await seedOwnerWithPlaylist(t, {
      is_public: true,
    });
    const owner = asUser(t, ownerId);

    await expect(
      t.query(api.playlists.getPublicPlaylist, { publicId: 'legacy-uuid' }),
    ).resolves.toMatchObject({ visibility: 'public' });

    const { shareId } = await owner.mutation(
      api.playlists.setPlaylistVisibility,
      { playlistId, visibility: 'unlisted' },
    );
    expect(shareId).toBe('legacy-uuid');

    await owner.mutation(api.playlists.resetPlaylistLink, { playlistId });
    await expect(
      t.query(api.playlists.getPublicPlaylist, { publicId: 'legacy-uuid' }),
    ).resolves.toBeNull();
  });

  it('refuses to share favorites or let someone else change visibility', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, playlistId } = await seedOwnerWithPlaylist(t, {
      is_favorites: true,
    });
    const otherId = await t.run(async (ctx) =>
      ctx.db.insert('users', { email: 'other@example.com', username: 'other' }),
    );

    await expect(
      asUser(t, ownerId).mutation(api.playlists.setPlaylistVisibility, {
        playlistId,
        visibility: 'public',
      }),
    ).rejects.toThrow('Favorites stay private');
    await expect(
      asUser(t, otherId).mutation(api.playlists.setPlaylistVisibility, {
        playlistId,
        visibility: 'private',
      }),
    ).rejects.toThrow('Not authorized');
  });

  it('matches audio on the server when a playlist is shared', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, playlistId, trackId } = await seedOwnerWithPlaylist(t);

    await asUser(t, ownerId).mutation(api.playlists.setPlaylistVisibility, {
      playlistId,
      visibility: 'unlisted',
    });

    const scheduled = await t.run(async (ctx) =>
      ctx.db.system.query('_scheduled_functions').collect(),
    );
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]).toMatchObject({
      name: 'playlistAudio:matchTrackAudio',
      args: [{ trackIds: [trackId] }],
    });
  });

  it('exposes the play mode and each track’s audio status to listeners', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, playlistId } = await seedOwnerWithPlaylist(t);
    const owner = asUser(t, ownerId);
    const { shareId } = await owner.mutation(
      api.playlists.setPlaylistVisibility,
      { playlistId, visibility: 'unlisted' },
    );
    await owner.mutation(api.playlists.updatePlaylist, {
      playlistId,
      play_mode: 'shuffle',
    });

    const playlist = await t.query(api.playlists.getPublicPlaylist, {
      publicId: shareId!,
    });
    expect(playlist?.playMode).toBe('shuffle');
    expect(playlist?.tracks[0].audio_status).toBe('pending');
  });
});
