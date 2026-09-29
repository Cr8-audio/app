/**
 * Turn a Discogs release (GET /releases/{id}) into rows for the `tracks`
 * table, in the format the Supabase migration used. Pure, so it can be
 * unit-tested directly.
 */
import { evaluateYouTubeCandidate } from './youtubeMatching';

export interface DiscogsArtistCredit {
  name: string;
  anv?: string;
  join?: string;
}

export interface DiscogsTrackEntry {
  position?: string;
  type_?: 'track' | 'heading' | 'index' | string;
  title: string;
  duration?: string;
  artists?: DiscogsArtistCredit[];
  extraartists?: DiscogsArtistCredit[];
  sub_tracks?: DiscogsTrackEntry[];
}

export interface DiscogsReleaseDetail {
  id: number;
  artists?: DiscogsArtistCredit[];
  genres?: string[];
  styles?: string[];
  tracklist?: DiscogsTrackEntry[];
  videos?: Array<{ uri: string; title: string }>;
}

export interface TrackRow {
  title: string;
  artist: string;
  extra_artists?: string;
  position: string;
  duration: string;
  genres?: string;
  styles?: string;
  artwork?: string;
  youtube_video_id?: string;
}

/** "Tiga, Zyntherius" or "Miss Kittin & The Hacker", from Discogs credits. */
export function artistCreditName(credits: DiscogsArtistCredit[] = []) {
  return credits
    .map((credit, index) => {
      const name = (credit.anv || credit.name).trim();
      if (index === credits.length - 1) return name;
      const join = credit.join?.trim();
      return !join || join === ',' ? `${name}, ` : `${name} ${join} `;
    })
    .join('')
    .trim();
}

/** Playable entries: headings dropped, index tracks expanded. */
function playableEntries(tracklist: DiscogsTrackEntry[] = []) {
  return tracklist.flatMap((entry): DiscogsTrackEntry[] => {
    if (entry.type_ === 'heading') return [];
    if (entry.type_ === 'index') return playableEntries(entry.sub_tracks);
    return entry.title.trim() ? [entry] : [];
  });
}

function youtubeIdFrom(uri: string): string | null {
  try {
    const url = new URL(uri);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;
    return url.searchParams.get('v');
  } catch {
    return null;
  }
}

/**
 * Give tracks the release's own YouTube videos, where one clearly matches.
 * Discogs users attach videos to releases; using them costs no search quota.
 * A video goes to the most specific track it matches, so a remix's video
 * isn't also given to the original mix, and each video is used once.
 */
export function assignReleaseVideos(
  tracks: Array<{ artist: string; title: string }>,
  videos: DiscogsReleaseDetail['videos'] = [],
): Array<string | undefined> {
  const candidates = videos.flatMap((video) => {
    const videoId = youtubeIdFrom(video.uri);
    if (!videoId) return [];
    return tracks.flatMap((track, index) => {
      const match = evaluateYouTubeCandidate(track, { title: video.title });
      return match.matches
        ? [
            {
              index,
              videoId,
              score: match.score,
              specificity: track.title.length,
            },
          ]
        : [];
    });
  });
  candidates.sort((a, b) => b.specificity - a.specificity || b.score - a.score);

  const assigned: Array<string | undefined> = tracks.map(() => undefined);
  const usedVideos = new Set<string>();
  for (const { index, videoId } of candidates) {
    if (assigned[index] || usedVideos.has(videoId)) continue;
    assigned[index] = videoId;
    usedVideos.add(videoId);
  }
  return assigned;
}

export function tracksFromRelease(
  release: DiscogsReleaseDetail,
  artwork?: string,
): TrackRow[] {
  const releaseArtist = artistCreditName(release.artists);
  const genres = release.genres?.join(',') || undefined;
  const styles = release.styles?.join(',') || undefined;

  const entries = playableEntries(release.tracklist).map((entry) => ({
    entry,
    artist:
      artistCreditName(entry.artists) || releaseArtist || 'Unknown Artist',
    title: entry.title.trim(),
  }));
  const videoIds = assignReleaseVideos(entries, release.videos);

  return entries.map(({ entry, artist, title }, index) => {
    const extraArtists = [
      ...new Set((entry.extraartists ?? []).map((credit) => credit.name)),
    ].join(', ');
    const videoId = videoIds[index];
    return {
      title,
      artist,
      ...(extraArtists ? { extra_artists: extraArtists } : {}),
      position: entry.position?.trim() ?? '',
      duration: entry.duration?.trim() ?? '',
      ...(genres ? { genres } : {}),
      ...(styles ? { styles } : {}),
      ...(artwork ? { artwork } : {}),
      ...(videoId ? { youtube_video_id: videoId } : {}),
    };
  });
}
