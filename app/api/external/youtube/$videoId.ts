import { createFileRoute } from '@tanstack/react-router';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export const Route = createFileRoute('/api/external/youtube/$videoId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const videoId = params.videoId;

          const videoResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=contentDetails,snippet`,
          );
          const videoData = await videoResponse.json();

          if (!videoData.items?.length) {
            return Response.json({ error: 'Video not found' }, { status: 404 });
          }
          const response = {
            audioUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1`,
            title: videoData.items[0].snippet.title,
            duration: videoData.items[0].contentDetails.duration,
          };
          // Return a signed URL for the iframe player API
          return Response.json(response);
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
