import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import {
  evaluateYouTubeCandidate,
  type TrackIdentity,
} from '@/lib/api-clients/youtube/matching';

const MAX_QUERY_LENGTH = 180;
const MAX_ARTIST_LENGTH = 120;
const MAX_TITLE_LENGTH = 160;

export const Route = createFileRoute('/api/external/youtube/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const rawQuery = url.searchParams.get('q')?.trim() ?? '';
        const artist = url.searchParams.get('artist')?.trim() ?? '';
        const title = url.searchParams.get('title')?.trim() ?? '';
        const requestedTrack: TrackIdentity | null = title
          ? { artist: artist || 'Unknown Artist', title }
          : null;
        const query = requestedTrack
          ? `${artist.replace(/\s+\(\d+\)(?=,|$)/g, '')} "${title}" audio`
              .replace(/\s+/g, ' ')
              .trim()
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
          const youtubeUrl = new URL(
            'https://www.googleapis.com/youtube/v3/search',
          );
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
            items?: Array<{
              id?: { videoId?: string };
              snippet?: {
                title?: string;
                channelTitle?: string;
                description?: string;
              };
            }>;
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
            return Response.json({ error: 'No results' }, { status: 404 });
          }

          const candidates = data.items
            .map((item) => {
              const videoId = item.id?.videoId;
              const candidateTitle = item.snippet?.title;
              if (!videoId || !candidateTitle) return null;

              const match = requestedTrack
                ? evaluateYouTubeCandidate(requestedTrack, {
                    title: candidateTitle,
                    channelTitle: item.snippet?.channelTitle,
                    description: item.snippet?.description,
                    // Search.list has already restricted these results to the
                    // Music category, so retain that fact for the matcher.
                    categoryId: '10',
                  })
                : { matches: true, score: 0 };

              return match.matches
                ? {
                    videoId,
                    title: candidateTitle,
                    channelTitle: item.snippet?.channelTitle,
                    score: match.score,
                  }
                : null;
            })
            .filter(
              (
                candidate,
              ): candidate is {
                videoId: string;
                title: string;
                channelTitle: string | undefined;
                score: number;
              } => candidate !== null,
            )
            .sort((a, b) => b.score - a.score);

          const bestMatch = candidates[0];
          if (!bestMatch) {
            return Response.json(
              {
                error: 'No confident music match',
                code: 'NO_CONFIDENT_MATCH',
              },
              { status: 404 },
            );
          }

          return Response.json(
            {
              videoId: bestMatch.videoId,
              title: bestMatch.title,
              channelTitle: bestMatch.channelTitle,
              matchScore: bestMatch.score,
            },
            {
              headers: {
                'Cache-Control': 'public, max-age=3600, s-maxage=86400',
              },
            },
          );
        } catch (error) {
          console.error('YouTube API error:', error);
          return Response.json(
            { error: 'Audio search failed', code: 'YOUTUBE_UPSTREAM_ERROR' },
            { status: 502 },
          );
        }
      },
    },
  },
});
