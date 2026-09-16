import { createFileRoute } from '@tanstack/react-router';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export const Route = createFileRoute('/api/external/youtube/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('q');

        if (!query) {
          return Response.json({ error: 'Missing query' }, { status: 400 });
        }

        if (!YOUTUBE_API_KEY) {
          return Response.json(
            { error: 'YouTube API key not configured' },
            { status: 500 },
          );
        }

        try {
          const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;

          const response = await fetch(youtubeUrl);
          const data = await response.json();

          if (!data.items?.length) {
            return Response.json({ error: 'No results' }, { status: 404 });
          }

          return Response.json({
            videoId: data.items[0].id.videoId,
            title: data.items[0].snippet.title,
          });
        } catch (error) {
          console.error('YouTube API error:', error);
          return Response.json({ error: 'API error' }, { status: 500 });
        }
      },
    },
  },
});
