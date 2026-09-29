import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import {
  buildYouTubeTrackQuery,
  rankYouTubeCandidates,
  type YouTubeSearchItem,
} from '@/convex/lib/youtubeApi';
import type { TrackIdentity } from '@/convex/lib/youtubeMatching';
import {
  edgeCache,
  isRateLimited,
  tooManyRequests,
} from '@/lib/security/rateLimit';

const MAX_QUERY_LENGTH = 180;
const MAX_ARTIST_LENGTH = 120;
const MAX_TITLE_LENGTH = 160;
// Answers, "no match" included, are kept at the edge for a day.
const CACHE_FOR_A_DAY = {
  'Cache-Control': 'public, max-age=3600, s-maxage=86400',
};

export const Route = createFileRoute('/api/external/youtube/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Each search.list call costs 100 of the Google project's roughly
        // 100 daily searches, so a search already answered in this location
        // is served from the edge, and each client gets a small allowance.
        const cache = edgeCache();
        const cached = await cache?.match(request);
        if (cached) return cached;
        if (await isRateLimited(env.YOUTUBE_SEARCH_LIMITER, request)) {
          return tooManyRequests('audio searches');
        }

        const response = await searchYouTube(request);
        if (cache && response.headers.has('Cache-Control')) {
          await cache.put(request, response.clone());
        }
        return response;
      },
    },
  },
});

async function searchYouTube(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rawQuery = url.searchParams.get('q')?.trim() ?? '';
  const artist = url.searchParams.get('artist')?.trim() ?? '';
  const title = url.searchParams.get('title')?.trim() ?? '';
  const requestedTrack: TrackIdentity | null = title
    ? { artist: artist || 'Unknown Artist', title }
    : null;
  const query = requestedTrack
    ? buildYouTubeTrackQuery({ artist, title })
    : rawQuery;

  if (!query) {
    return Response.json({ error: 'Missing query' }, { status: 400 });
  }

  if (
    query.length >
      (requestedTrack
        ? MAX_ARTIST_LENGTH + MAX_TITLE_LENGTH + 16
        : MAX_QUERY_LENGTH) ||
    artist.length > MAX_ARTIST_LENGTH ||
    title.length > MAX_TITLE_LENGTH
  ) {
    return Response.json(
      { error: 'Invalid search query', code: 'INVALID_QUERY' },
      { status: 400 },
    );
  }

  const youtubeApiKey = env.YOUTUBE_API_KEY;
  if (!youtubeApiKey) {
    return Response.json(
      {
        error: 'Audio search is temporarily unavailable',
        code: 'YOUTUBE_NOT_CONFIGURED',
      },
      { status: 503 },
    );
  }

  try {
    const youtubeUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    youtubeUrl.search = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      videoCategoryId: '10',
      maxResults: requestedTrack ? '10' : '5',
      q: query,
      key: youtubeApiKey,
    }).toString();

    const response = await fetch(youtubeUrl);
    const data = (await response.json()) as {
      items?: YouTubeSearchItem[];
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error(
        'YouTube API request failed:',
        response.status,
        data.error?.message,
      );
      return Response.json(
        {
          error:
            response.status === 403
              ? 'Audio search quota is unavailable'
              : 'Audio search failed',
          code: 'YOUTUBE_UPSTREAM_ERROR',
        },
        { status: response.status === 429 ? 429 : 502 },
      );
    }

    if (!data.items?.length) {
      return Response.json(
        { error: 'No results' },
        { status: 404, headers: CACHE_FOR_A_DAY },
      );
    }

    const candidates = requestedTrack
      ? rankYouTubeCandidates(requestedTrack, data.items)
      : data.items.flatMap((item) =>
          item.id?.videoId && item.snippet?.title
            ? [
                {
                  videoId: item.id.videoId,
                  title: item.snippet.title,
                  channelTitle: item.snippet.channelTitle,
                  score: 0,
                },
              ]
            : [],
        );

    const bestMatch = candidates[0];
    if (!bestMatch) {
      return Response.json(
        {
          error: 'No confident music match',
          code: 'NO_CONFIDENT_MATCH',
        },
        { status: 404, headers: CACHE_FOR_A_DAY },
      );
    }

    return Response.json(
      {
        videoId: bestMatch.videoId,
        title: bestMatch.title,
        channelTitle: bestMatch.channelTitle,
        matchScore: bestMatch.score,
      },
      { headers: CACHE_FOR_A_DAY },
    );
  } catch (error) {
    console.error('YouTube API error:', error);
    return Response.json(
      { error: 'Audio search failed', code: 'YOUTUBE_UPSTREAM_ERROR' },
      { status: 502 },
    );
  }
}
