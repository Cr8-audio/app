import { getAuthUserId } from '@convex-dev/auth/server';
import {
  query,
  mutation,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { v } from 'convex/values';
import {
  generateShareId,
  isLegacyFlagSet,
  isShared,
  playlistVisibility,
  trackAudioStatus,
} from './lib/playlistSharing';

type DatabaseContext = Pick<QueryCtx, 'db'> | Pick<MutationCtx, 'db'>;

const vVisibility = v.union(
  v.literal('private'),
  v.literal('unlisted'),
  v.literal('public'),
);
const vPlayMode = v.union(v.literal('in_order'), v.literal('shuffle'));

/** The owner's view: legacy flags resolved into visibility and play mode. */
function normalizePlaylist(playlist: Doc<'playlists'>) {
  // is_public is legacy; visibility replaces it.
  const { is_public: _legacyIsPublic, ...rest } = playlist;
  return {
    ...rest,
    is_favorites: isLegacyFlagSet(playlist.is_favorites),
    visibility: playlistVisibility(playlist),
    play_mode: playlist.play_mode ?? 'in_order',
  };
}

/** The ID in a playlist's public link. */
function publicIdOf(playlist: Doc<'playlists'>) {
  return playlist.share_id ?? playlist.id;
}

function toPlaylistTrack(track: Doc<'tracks'>, playlistPosition: number) {
  return {
    ...track,
    discogs_release_id: String(track.discogs_release_id),
    youtube_video_id: track.youtube_video_id ?? null,
    extra_artists: track.extra_artists ?? null,
    genres: track.genres ?? null,
    styles: track.styles ?? null,
    artwork: track.artwork ?? null,
    created_at: track.created_at ?? null,
    audio_status: trackAudioStatus(track),
    playlistPosition,
  };
}

async function isPlaylistOwner(
  ctx: DatabaseContext,
  userId: Id<'users'>,
  playlist: Doc<'playlists'>,
) {
  const user = await ctx.db.get(userId);
  return (
    playlist.user_id === user?.email ||
    playlist.user_id === userId ||
    playlist.user_id === user?.supabaseUserId
  );
}

async function getPlaylistTracks(
  ctx: DatabaseContext,
  playlistId: Id<'playlists'>,
) {
  const playlistTracks = await ctx.db
    .query('playlist_tracks')
    .withIndex('by_playlist_position', (q) => q.eq('playlist_id', playlistId))
    .collect();

  const tracks = await Promise.all(
    playlistTracks.map(async (playlistTrack) => {
      const track = await ctx.db.get(playlistTrack.track_id);
      return track ? { track, playlistPosition: playlistTrack.position } : null;
    }),
  );

  return tracks.filter(
    (
      item,
    ): item is {
      track: Doc<'tracks'>;
      playlistPosition: number;
    } => item !== null,
  );
}

async function resolvePlaylistOwner(
  ctx: Pick<QueryCtx, 'db'>,
  ownerIdentifier: string,
) {
  const normalizedUserId = ctx.db.normalizeId('users', ownerIdentifier);
  if (normalizedUserId) {
    const owner = await ctx.db.get(normalizedUserId);
    if (owner) return owner;
  }

  const ownerByEmail = await ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', ownerIdentifier))
    .first();
  if (ownerByEmail) return ownerByEmail;

  return await ctx.db
    .query('users')
    .withIndex('by_supabase_id', (q) => q.eq('supabaseUserId', ownerIdentifier))
    .first();
}

function toPublicOwner(owner: Doc<'users'>) {
  return {
    username: owner.username ?? null,
    displayName: owner.displayName ?? null,
    avatarUrl: owner.avatarUrl ?? null,
  };
}

export async function getPlaylistsForUser(
  ctx: Pick<QueryCtx, 'db'>,
  user: Doc<'users'>,
) {
  const ownerIdentifiers = [user._id, user.email, user.supabaseUserId].filter(
    (identifier): identifier is string => Boolean(identifier),
  );
  const playlistGroups = await Promise.all(
    ownerIdentifiers.map((ownerIdentifier) =>
      ctx.db
        .query('playlists')
        .withIndex('by_user', (q) => q.eq('user_id', ownerIdentifier))
        .collect(),
    ),
  );

  return [
    ...new Map(
      playlistGroups
        .flat()
        .map((playlist) => [playlist._id, playlist] as const),
    ).values(),
  ];
}

/**
 * Load a playlist the current user owns. Playlists store the owner under
 * whichever id was current when they were made (email, Convex id, or the
 * migrated Supabase id).
 */
async function getOwnedPlaylist(
  ctx: MutationCtx,
  userId: Id<'users'>,
  playlistId: Id<'playlists'>,
) {
  const playlist = await ctx.db.get(playlistId);
  if (!playlist) {
    throw new Error('Playlist not found');
  }
  if (!(await isPlaylistOwner(ctx, userId, playlist))) {
    throw new Error('Not authorized');
  }
  return playlist;
}

/**
 * Get all playlists for the authenticated user
 */
export const getUserPlaylists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return [];
    }

    // Native and migrated playlists can be split across the Convex user ID,
    // email, and legacy Supabase ID. Merge all three rather than stopping at
    // the first non-empty source, otherwise newly-created playlists disappear
    // for users who also have legacy records.
    const playlists = await getPlaylistsForUser(ctx, user);

    // Get tracks for each playlist
    const playlistsWithTracks = await Promise.all(
      playlists.map(async (playlist) => {
        const tracks = await getPlaylistTracks(ctx, playlist._id);

        return {
          ...normalizePlaylist(playlist),
          tracks: tracks.map(({ track, playlistPosition }) =>
            toPlaylistTrack(track, playlistPosition),
          ),
        };
      }),
    );

    return playlistsWithTracks;
  },
});

/**
 * Get a single playlist with its tracks
 */
export const getPlaylist = query({
  args: { playlistId: v.id('playlists') },
  handler: async (ctx, { playlistId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const playlist = await ctx.db.get(playlistId);
    if (!playlist || !(await isPlaylistOwner(ctx, userId, playlist))) {
      return null;
    }

    const tracks = await getPlaylistTracks(ctx, playlistId);

    return {
      ...normalizePlaylist(playlist),
      tracks: tracks.map(({ track, playlistPosition }) =>
        toPlaylistTrack(track, playlistPosition),
      ),
    };
  },
});

/**
 * Find a shared (unlisted or public) playlist by the ID in its link. Links
 * from before share IDs existed use the legacy UUID until the link is reset.
 */
async function findSharedPlaylist(ctx: Pick<QueryCtx, 'db'>, publicId: string) {
  const playlist =
    (await ctx.db
      .query('playlists')
      .withIndex('by_share_id', (q) => q.eq('share_id', publicId))
      .first()) ??
    (await ctx.db
      .query('playlists')
      .withIndex('by_old_id', (q) => q.eq('id', publicId))
      .first()
      .then((legacy) => (legacy?.share_id ? null : legacy)));

  if (!playlist || !isShared(playlistVisibility(playlist))) return null;
  return playlist;
}

/**
 * Get the deliberately public projection of a shared playlist. Missing and
 * private playlists both return null so callers cannot probe private records.
 */
export const getPublicPlaylist = query({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    const playlist = await findSharedPlaylist(ctx, publicId);
    if (!playlist) {
      return null;
    }

    const [owner, playlistTracks] = await Promise.all([
      resolvePlaylistOwner(ctx, playlist.user_id),
      getPlaylistTracks(ctx, playlist._id),
    ]);

    return {
      publicId: publicIdOf(playlist),
      title: playlist.title,
      description: playlist.description ?? null,
      coverImageUrl: playlist.cover_image_url ?? null,
      visibility: playlistVisibility(playlist),
      playMode: playlist.play_mode ?? 'in_order',
      owner: owner ? toPublicOwner(owner) : null,
      tracks: playlistTracks.map(({ track, playlistPosition }) => ({
        id: track.id,
        discogs_release_id: String(track.discogs_release_id),
        youtube_video_id: track.youtube_video_id ?? null,
        title: track.title,
        artist: track.artist,
        extra_artists: track.extra_artists ?? null,
        position: track.position,
        duration: track.duration,
        genres: track.genres ?? null,
        styles: track.styles ?? null,
        artwork: track.artwork ?? null,
        created_at: track.created_at ?? null,
        audio_status: trackAudioStatus(track),
        playlistPosition,
      })),
    };
  },
});

/**
 * Resolve all published playlists for a username across the identifiers used
 * by native and migrated records. The result is intentionally summary-only so
 * a public profile does not expose track or account data unnecessarily.
 */
export const getPublicPlaylistsByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const owner = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', username.toLowerCase()))
      .first();
    if (!owner) {
      return null;
    }

    const ownerPlaylists = await getPlaylistsForUser(ctx, owner);
    // Unlisted playlists work by link but stay off the profile.
    const publicPlaylists = ownerPlaylists
      .filter((playlist) => playlistVisibility(playlist) === 'public')
      .sort((a, b) => {
        const aDate = a.updated_at ?? a.created_at ?? '';
        const bDate = b.updated_at ?? b.created_at ?? '';
        return bDate.localeCompare(aDate) || a.title.localeCompare(b.title);
      });

    const playlists = await Promise.all(
      publicPlaylists.map(async (playlist) => {
        const playlistTracks = await getPlaylistTracks(ctx, playlist._id);
        const artworkUrls = [
          ...new Set(
            playlistTracks
              .map(({ track }) => track.artwork)
              .filter((artwork): artwork is string => Boolean(artwork)),
          ),
        ].slice(0, 4);

        return {
          publicId: publicIdOf(playlist),
          title: playlist.title,
          description: playlist.description ?? null,
          coverImageUrl: playlist.cover_image_url ?? null,
          trackCount: playlistTracks.length,
          artworkUrls,
        };
      }),
    );

    return {
      owner: toPublicOwner(owner),
      playlists,
    };
  },
});

/**
 * Get playlist by old string ID
 */
export const getPlaylistByOldId = query({
  args: { oldId: v.string() },
  handler: async (ctx, { oldId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const playlist = await ctx.db
      .query('playlists')
      .withIndex('by_old_id', (q) => q.eq('id', oldId))
      .first();

    if (!playlist || !(await isPlaylistOwner(ctx, userId, playlist))) {
      return null;
    }

    return normalizePlaylist(playlist);
  },
});

/**
 * Create a new playlist
 */
export const createPlaylist = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { title, description }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const playlistId = await ctx.db.insert('playlists', {
      id: crypto.randomUUID(), // Generate old-style UUID for compatibility
      user_id: user.email || userId, // Use email for consistency with migrated data
      title,
      description: description || '',
      visibility: 'private',
      is_favorites: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { playlistId };
  },
});

/**
 * Create a playlist and add tracks to it in one transaction, in the order
 * given.
 */
export const createPlaylistWithTracks = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    trackIds: v.array(v.id('tracks')),
  },
  handler: async (ctx, { title, description, trackIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const trimmed = title.trim();
    if (!trimmed) {
      throw new Error('Playlist title is required');
    }

    const now = new Date().toISOString();
    const playlistId = await ctx.db.insert('playlists', {
      id: crypto.randomUUID(),
      user_id: user.email || userId,
      title: trimmed,
      description: description || '',
      visibility: 'private',
      is_favorites: false,
      created_at: now,
      updated_at: now,
    });

    const uniqueTrackIds = [...new Set(trackIds)];
    let added = 0;
    for (const trackId of uniqueTrackIds) {
      if (!(await ctx.db.get(trackId))) continue;
      await ctx.db.insert('playlist_tracks', {
        id: crypto.randomUUID(),
        playlist_id: playlistId,
        track_id: trackId,
        position: added,
        created_at: now,
      });
      added++;
    }

    return { playlistId, trackCount: added };
  },
});

/**
 * Update a playlist's details and how it plays for listeners. Visibility has
 * its own mutation, setPlaylistVisibility.
 */
export const updatePlaylist = mutation({
  args: {
    playlistId: v.id('playlists'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    play_mode: v.optional(vPlayMode),
  },
  handler: async (ctx, { playlistId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    await getOwnedPlaylist(ctx, userId, playlistId);

    await ctx.db.patch(playlistId, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    return await ctx.db.get(playlistId);
  },
});

/**
 * Make a playlist private, unlisted or public. Sharing gives it a share ID
 * (kept across later visibility changes, so links come back when re-shared)
 * and starts matching audio for its tracks.
 */
export const setPlaylistVisibility = mutation({
  args: {
    playlistId: v.id('playlists'),
    visibility: vVisibility,
  },
  handler: async (ctx, { playlistId, visibility }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const playlist = await getOwnedPlaylist(ctx, userId, playlistId);
    if (isLegacyFlagSet(playlist.is_favorites) && isShared(visibility)) {
      throw new Error('Favorites stay private');
    }

    const shareId = isShared(visibility)
      ? shareIdFor(playlist)
      : playlist.share_id;

    await ctx.db.patch(playlistId, {
      visibility,
      share_id: shareId,
      is_public: undefined,
      updated_at: new Date().toISOString(),
    });

    if (isShared(visibility)) {
      await scheduleAudioMatching(ctx, playlistId);
    }

    return { visibility, shareId: shareId ?? null };
  },
});

/** The link ID a playlist gets when it's shared. */
function shareIdFor(playlist: Doc<'playlists'>) {
  if (playlist.share_id) return playlist.share_id;
  // Keep links shared before share IDs existed working.
  return playlistVisibility(playlist) === 'private'
    ? generateShareId()
    : playlist.id;
}

/**
 * Replace a playlist's share ID. Its old link and embed code stop working.
 */
export const resetPlaylistLink = mutation({
  args: { playlistId: v.id('playlists') },
  handler: async (ctx, { playlistId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    await getOwnedPlaylist(ctx, userId, playlistId);
    const shareId = generateShareId();
    await ctx.db.patch(playlistId, {
      share_id: shareId,
      updated_at: new Date().toISOString(),
    });
    return { shareId };
  },
});

/**
 * Match audio on the server for a shared playlist's tracks, so listeners
 * never spend YouTube quota from their browsers (see playlistAudio.ts).
 */
async function scheduleAudioMatching(
  ctx: MutationCtx,
  playlistId: Id<'playlists'>,
  trackIds?: Id<'tracks'>[],
) {
  const ids =
    trackIds ??
    (
      await ctx.db
        .query('playlist_tracks')
        .withIndex('by_playlist_position', (q) =>
          q.eq('playlist_id', playlistId),
        )
        .collect()
    ).map((playlistTrack) => playlistTrack.track_id);
  if (ids.length === 0) return;
  await ctx.scheduler.runAfter(0, internal.playlistAudio.matchTrackAudio, {
    trackIds: ids,
  });
}

/**
 * Delete a playlist
 */
export const deletePlaylist = mutation({
  args: { playlistId: v.id('playlists') },
  handler: async (ctx, { playlistId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    await getOwnedPlaylist(ctx, userId, playlistId);

    // Delete playlist tracks first
    const playlistTracks = await ctx.db
      .query('playlist_tracks')
      .withIndex('by_playlist_position', (q) => q.eq('playlist_id', playlistId))
      .collect();

    for (const pt of playlistTracks) {
      await ctx.db.delete(pt._id);
    }

    // Delete the playlist
    await ctx.db.delete(playlistId);

    return { success: true };
  },
});

/**
 * Add a track to a playlist
 */
export const addTrackToPlaylist = mutation({
  args: {
    playlistId: v.id('playlists'),
    trackId: v.id('tracks'),
  },
  handler: async (ctx, { playlistId, trackId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const playlist = await getOwnedPlaylist(ctx, userId, playlistId);

    const existing = await ctx.db
      .query('playlist_tracks')
      .withIndex('by_playlist_track', (q) =>
        q.eq('playlist_id', playlistId).eq('track_id', trackId),
      )
      .first();
    if (existing) {
      return { success: true, message: 'Track already in playlist' };
    }

    const lastTrack = await ctx.db
      .query('playlist_tracks')
      .withIndex('by_playlist_position', (q) => q.eq('playlist_id', playlistId))
      .order('desc')
      .first();

    await ctx.db.insert('playlist_tracks', {
      id: crypto.randomUUID(),
      playlist_id: playlistId,
      track_id: trackId,
      position: (lastTrack?.position ?? -1) + 1,
      created_at: new Date().toISOString(),
    });

    if (isShared(playlistVisibility(playlist))) {
      await scheduleAudioMatching(ctx, playlistId, [trackId]);
    }

    return { success: true };
  },
});

/**
 * Remove a track from a playlist
 */
export const removeTrackFromPlaylist = mutation({
  args: {
    playlistId: v.id('playlists'),
    trackId: v.id('tracks'),
  },
  handler: async (ctx, { playlistId, trackId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    await getOwnedPlaylist(ctx, userId, playlistId);

    const playlistTrack = await ctx.db
      .query('playlist_tracks')
      .withIndex('by_playlist_track', (q) =>
        q.eq('playlist_id', playlistId).eq('track_id', trackId),
      )
      .first();

    if (playlistTrack) {
      await ctx.db.delete(playlistTrack._id);
    }

    return { success: true };
  },
});

/**
 * Replace the ordering of a playlist with the supplied track order. Requiring
 * the exact current set prevents a reorder request from implicitly adding or
 * deleting tracks.
 */
export const reorderPlaylistTracks = mutation({
  args: {
    playlistId: v.id('playlists'),
    trackIds: v.array(v.id('tracks')),
  },
  handler: async (ctx, { playlistId, trackIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    await getOwnedPlaylist(ctx, userId, playlistId);

    const playlistTracks = await ctx.db
      .query('playlist_tracks')
      .withIndex('by_playlist_position', (q) => q.eq('playlist_id', playlistId))
      .collect();

    const uniqueTrackIds = new Set(trackIds);
    const playlistTrackByTrackId = new Map(
      playlistTracks.map((playlistTrack) => [
        playlistTrack.track_id,
        playlistTrack,
      ]),
    );

    if (
      uniqueTrackIds.size !== trackIds.length ||
      playlistTracks.length !== trackIds.length ||
      playlistTrackByTrackId.size !== playlistTracks.length ||
      trackIds.some((trackId) => !playlistTrackByTrackId.has(trackId))
    ) {
      throw new Error('Track order must contain every playlist track once');
    }

    for (const [position, trackId] of trackIds.entries()) {
      const playlistTrack = playlistTrackByTrackId.get(trackId);
      if (!playlistTrack || playlistTrack.position === position) continue;
      await ctx.db.patch(playlistTrack._id, { position });
    }

    await ctx.db.patch(playlistId, {
      updated_at: new Date().toISOString(),
    });

    return { success: true, trackCount: trackIds.length };
  },
});
