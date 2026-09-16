import { createFileRoute } from '@tanstack/react-router';
import { parse } from 'cookie';

/**
 * Check if Discogs OAuth tokens are present in cookies.
 * This doesn't validate the tokens with Discogs API, just checks if they exist.
 */
export const Route = createFileRoute('/api/auth/discogs/status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const cookies = parse(request.headers.get('cookie') || '');
          const accessToken = cookies['access_token'];
          const accessTokenSecret = cookies['access_token_secret'];
          const userData = cookies['user_data'];

          const hasOAuthTokens = !!(accessToken && accessTokenSecret);
          const hasUserData = !!userData;

          let username = null;
          if (userData) {
            try {
              const parsed = JSON.parse(decodeURIComponent(userData));
              username = parsed.username;
            } catch {
              // Invalid user_data cookie
            }
          }

          return Response.json({
            hasOAuthTokens,
            hasUserData,
            isFullyConnected: hasOAuthTokens && hasUserData,
            username,
          });
        } catch (error) {
          console.error('Error checking Discogs status:', error);
          return Response.json(
            { error: 'Failed to check status' },
            { status: 500 },
          );
        }
      },
    },
  },
});
