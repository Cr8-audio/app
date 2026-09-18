import type { CrateTrack, Release, Track } from '@/lib/types';

export class YouTubeSearchError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'YouTubeSearchError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Get the base URL for API calls.
 * Uses window.location.origin on client, falls back for SSR.
 */
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // SSR fallback - this should rarely be hit for YouTube service
  return import.meta.env.VITE_BASE_URL || 'http://localhost:1995';
}

async function readYouTubeResponse(response: Response) {
  const data = (await response.json().catch(() => null)) as {
    videoId?: string;
    matches?: boolean;
    error?: string;
    code?: string;
  } | null;

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new YouTubeSearchError(
      data?.error || 'YouTube search is temporarily unavailable',
      response.status,
      data?.code,
    );
  }

  return data;
}

export async function searchVideo(query: string): Promise<string | null> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return null;

  const baseUrl = getBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/external/youtube/search?q=${encodeURIComponent(trimmedQuery)}`,
  );
  const data = await readYouTubeResponse(response);

  return data?.videoId || null;
}

export async function searchTrackVideo(
  track: Pick<CrateTrack, 'artist' | 'title'>,
): Promise<string | null> {
  const params = new URLSearchParams({
    artist: track.artist,
    title: track.title,
  });
  const response = await fetch(
    `${getBaseUrl()}/api/external/youtube/search?${params.toString()}`,
  );
  const data = await readYouTubeResponse(response);
  return data?.videoId || null;
}

export async function validateTrackVideo(
  videoId: string,
  track: Pick<CrateTrack, 'artist' | 'title'>,
): Promise<boolean> {
  const params = new URLSearchParams({
    artist: track.artist,
    title: track.title,
  });
  const response = await fetch(
    `${getBaseUrl()}/api/external/youtube/${encodeURIComponent(videoId)}?${params.toString()}`,
  );
  const data = await readYouTubeResponse(response);
  return data?.matches === true;
}

/**
 * Discogs appends numeric disambiguators to some artist names (for example
 * "Intense (2)"). They are useful in Discogs, but make YouTube matching worse.
 */
export function buildTrackSearchQuery(
  track: Pick<CrateTrack, 'artist' | 'title'>,
): string {
  const artist = track.artist.replace(/\s+\(\d+\)(?=,|$)/g, '').trim();
  return `${artist} ${track.title} audio`.replace(/\s+/g, ' ').trim();
}

export async function findTrackVideo(
  track: Track,
  release: Release,
): Promise<string | null> {
  const matchingVideo = release.videos?.find(
    (video) =>
      video.title.toLowerCase() === track.title.toLowerCase() ||
      video.title.toLowerCase().includes(track.title.toLowerCase()),
  );

  if (matchingVideo?.uri) {
    const videoId = new URL(matchingVideo.uri).searchParams.get('v');
    if (videoId) return videoId;
  }

  return searchTrackVideo({
    title: track.title,
    artist: release.artists[0]?.name || 'Unknown Artist',
  });
}
