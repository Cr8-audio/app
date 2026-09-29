/**
 * YouTube Data API calls shared by the Worker's /api/external/youtube routes
 * and Convex actions. Quota: search.list costs 100 units a call, videos.list
 * costs 1 for up to 50 IDs, and a project gets 10,000 units a day by default.
 */
import {
  evaluateYouTubeCandidate,
  type TrackIdentity,
} from './youtubeMatching';

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
export const MAX_VIDEOS_PER_LOOKUP = 50;

export class YouTubeApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'YouTubeApiError';
    this.status = status;
  }

  /** 403 is how YouTube reports an exhausted daily quota. */
  get isQuotaError() {
    return this.status === 403 || this.status === 429;
  }
}

export interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: { title?: string; channelTitle?: string; description?: string };
}

export interface YouTubeMatch {
  videoId: string;
  title: string;
  channelTitle?: string;
  score: number;
}

/**
 * Discogs appends disambiguators to some artist names ("Intense (2)"). They
 * make YouTube search worse, so drop them and quote the title.
 */
export function buildYouTubeTrackQuery(track: TrackIdentity): string {
  const artist = track.artist.replace(/\s+\(\d+\)(?=,|$)/g, '');
  return `${artist} "${track.title}" audio`.replace(/\s+/g, ' ').trim();
}

/** Search results that pass the matcher, best first. */
export function rankYouTubeCandidates(
  track: TrackIdentity,
  items: YouTubeSearchItem[],
): YouTubeMatch[] {
  return items
    .flatMap((item) => {
      const videoId = item.id?.videoId;
      const title = item.snippet?.title;
      if (!videoId || !title) return [];
      const match = evaluateYouTubeCandidate(track, {
        title,
        channelTitle: item.snippet?.channelTitle,
        description: item.snippet?.description,
        // search.list is already restricted to the Music category.
        categoryId: '10',
      });
      return match.matches
        ? [
            {
              videoId,
              title,
              channelTitle: item.snippet?.channelTitle,
              score: match.score,
            },
          ]
        : [];
    })
    .sort((a, b) => b.score - a.score);
}

async function callYouTube<T>(path: string, params: Record<string, string>) {
  const url = new URL(`${YOUTUBE_API}/${path}`);
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url);
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new YouTubeApiError(
      data.error?.message ?? `YouTube ${path} failed`,
      response.status,
    );
  }
  return data;
}

/** The best confident music match for a track, or null. 100 quota units. */
export async function searchYouTubeTrack(
  apiKey: string,
  track: TrackIdentity,
): Promise<YouTubeMatch | null> {
  const data = await callYouTube<{ items?: YouTubeSearchItem[] }>('search', {
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    videoCategoryId: '10',
    maxResults: '10',
    q: buildYouTubeTrackQuery(track),
    key: apiKey,
  });
  return rankYouTubeCandidates(track, data.items ?? [])[0] ?? null;
}

/**
 * Check stored video IDs against their tracks in one call (1 quota unit for
 * up to 50). A video counts only if it still exists, can be embedded and
 * matches the track. Returns the IDs that passed.
 */
export async function checkYouTubeVideos(
  apiKey: string,
  entries: Array<{ videoId: string; track: TrackIdentity }>,
): Promise<Set<string>> {
  if (entries.length === 0) return new Set();
  if (entries.length > MAX_VIDEOS_PER_LOOKUP) {
    throw new Error(`Check at most ${MAX_VIDEOS_PER_LOOKUP} videos at a time`);
  }

  const data = await callYouTube<{
    items?: Array<{
      id: string;
      snippet: {
        title: string;
        channelTitle?: string;
        description?: string;
        categoryId?: string;
      };
      status?: { embeddable?: boolean };
    }>;
  }>('videos', {
    id: entries.map((entry) => entry.videoId).join(','),
    part: 'snippet,status',
    key: apiKey,
  });

  const videos = new Map((data.items ?? []).map((item) => [item.id, item]));
  const passed = new Set<string>();
  for (const { videoId, track } of entries) {
    const video = videos.get(videoId);
    if (!video || video.status?.embeddable === false) continue;
    const match = evaluateYouTubeCandidate(track, {
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      description: video.snippet.description,
      categoryId: video.snippet.categoryId,
    });
    if (match.matches) passed.add(videoId);
  }
  return passed;
}
