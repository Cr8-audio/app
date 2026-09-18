import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { evaluateYouTubeCandidate } from '@/lib/api-clients/youtube/matching';

export const Route = createFileRoute('/api/external/youtube/$videoId')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const videoId = params.videoId;
          if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
            return Response.json(
              { error: 'Invalid video ID' },
              { status: 400 },
            );
          }

          const youtubeApiKey = env.YOUTUBE_API_KEY;
          if (!youtubeApiKey) {
            return Response.json(
              {
                error: 'Audio lookup is temporarily unavailable',
                code: 'YOUTUBE_NOT_CONFIGURED',
              },
              { status: 503 },
            );
          }

          const videoResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeApiKey}&part=contentDetails,snippet,status`,
          );
          const videoData = (await videoResponse.json()) as {
            items?: Array<{
              snippet: {
                title: string;
                channelTitle?: string;
                description?: string;
                categoryId?: string;
              };
              contentDetails: { duration: string };
              status?: { embeddable?: boolean };
            }>;
          };

          if (!videoResponse.ok) {
            return Response.json(
              { error: 'Failed to get video data' },
              { status: 502 },
            );
          }

          if (!videoData.items?.length) {
            return Response.json({ error: 'Video not found' }, { status: 404 });
          }
          const video = videoData.items[0];
          const url = new URL(request.url);
          const artist = url.searchParams.get('artist')?.trim() ?? '';
          const title = url.searchParams.get('title')?.trim() ?? '';
          const match = title
            ? evaluateYouTubeCandidate(
                { artist: artist || 'Unknown Artist', title },
                {
                  title: video.snippet.title,
                  channelTitle: video.snippet.channelTitle,
                  description: video.snippet.description,
                  categoryId: video.snippet.categoryId,
                },
              )
            : null;
          const embeddable = video.status?.embeddable !== false;
          const response = {
            audioUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1`,
            title: video.snippet.title,
            channelTitle: video.snippet.channelTitle,
            duration: video.contentDetails.duration,
            categoryId: video.snippet.categoryId,
            embeddable,
            matches: match ? match.matches && embeddable : undefined,
            matchScore: match?.score,
            matchReason: match?.reason,
          };
          return Response.json(response, {
            headers: {
              'Cache-Control': 'public, max-age=3600, s-maxage=86400',
            },
          });
        } catch (error) {
          console.error('YouTube API error:', error);
          return Response.json(
            { error: 'Failed to get video data' },
            { status: 500 },
          );
        }
      },
    },
  },
});
