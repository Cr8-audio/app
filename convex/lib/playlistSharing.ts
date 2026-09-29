/**
 * Pure rules for sharing playlists (no Convex or network access), so they can
 * be unit-tested directly.
 *
 * - private: only the owner.
 * - unlisted: anyone with the link or embed; not listed on the profile.
 * - public: link, embed, and listed on /listen/<username>.
 */

export type PlaylistVisibility = 'private' | 'unlisted' | 'public';
export type PlaylistPlayMode = 'in_order' | 'shuffle';

export const PLAYLIST_VISIBILITIES: PlaylistVisibility[] = [
  'private',
  'unlisted',
  'public',
];

type LegacyFlag = boolean | string | undefined;

/** Supabase imports stored booleans as "t"/"f" strings. */
export function isLegacyFlagSet(value: LegacyFlag): boolean {
  return value === true || value === 't' || value === 'true';
}

/**
 * The effective visibility of a playlist. Rows from before `visibility`
 * existed fall back to the legacy `is_public` flag; favorites are never
 * shared.
 */
export function playlistVisibility(playlist: {
  visibility?: PlaylistVisibility;
  is_public?: LegacyFlag;
  is_favorites?: LegacyFlag;
}): PlaylistVisibility {
  if (isLegacyFlagSet(playlist.is_favorites)) return 'private';
  if (playlist.visibility) return playlist.visibility;
  return isLegacyFlagSet(playlist.is_public) ? 'public' : 'private';
}

export function isShared(visibility: PlaylistVisibility): boolean {
  return visibility !== 'private';
}

const SHARE_ID_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const SHARE_ID_LENGTH = 12;

/**
 * A short, unguessable link ID (about 71 bits). Rejection sampling keeps every
 * character equally likely.
 */
export function generateShareId(
  getRandomValues: (array: Uint8Array) => Uint8Array = (array) =>
    crypto.getRandomValues(array),
): string {
  let id = '';
  while (id.length < SHARE_ID_LENGTH) {
    for (const byte of getRandomValues(new Uint8Array(SHARE_ID_LENGTH * 2))) {
      // 248 is the largest multiple of 62 below 256.
      if (byte < 248) id += SHARE_ID_ALPHABET[byte % 62];
      if (id.length === SHARE_ID_LENGTH) break;
    }
  }
  return id;
}

/**
 * Where a track's audio stands, from what the server has verified:
 * - ready: a video the server checked against the track.
 * - unverified: a stored video nobody has checked yet (legacy data).
 * - pending: no video yet; the server hasn't searched.
 * - unavailable: the server searched and found no confident match.
 */
export type TrackAudioStatus =
  | 'ready'
  | 'unverified'
  | 'pending'
  | 'unavailable';

export function trackAudioStatus(track: {
  youtube_video_id?: string | null;
  youtube_checked_at?: number;
}): TrackAudioStatus {
  if (track.youtube_video_id) {
    return track.youtube_checked_at ? 'ready' : 'unverified';
  }
  return track.youtube_checked_at ? 'unavailable' : 'pending';
}

/** Search again for tracks with no match after this long. */
export const AUDIO_RECHECK_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export function needsAudioCheck(
  track: { youtube_video_id?: string | null; youtube_checked_at?: number },
  now: number,
): boolean {
  if (!track.youtube_checked_at) return true;
  return (
    !track.youtube_video_id &&
    now - track.youtube_checked_at > AUDIO_RECHECK_AFTER_MS
  );
}
