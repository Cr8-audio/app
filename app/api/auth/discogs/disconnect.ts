import { createFileRoute } from '@tanstack/react-router';
import { serialize } from 'cookie';

/**
 * Disconnect Discogs by clearing OAuth cookies.
 * Note: This only clears the browser cookies, not the Convex profile.
 * The client should also call the Convex mutation to remove the profile.
 */
export const Route = createFileRoute('/api/auth/discogs/disconnect')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const headers = new Headers();

          // Clear all Discogs-related cookies
          headers.append(
            'Set-Cookie',
            serialize('access_token', '', { maxAge: -1, path: '/' }),
          );
          headers.append(
            'Set-Cookie',
            serialize('access_token_secret', '', { maxAge: -1, path: '/' }),
          );
          headers.append(
            'Set-Cookie',
            serialize('user_data', '', { maxAge: -1, path: '/' }),
          );
          headers.append(
            'Set-Cookie',
            serialize('request_token', '', { maxAge: -1, path: '/' }),
          );
          headers.append(
            'Set-Cookie',
            serialize('request_token_secret', '', { maxAge: -1, path: '/' }),
          );

          return new Response(
            JSON.stringify({ success: true, message: 'Discogs disconnected' }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                ...Object.fromEntries(headers.entries()),
              },
            },
          );
        } catch (error) {
          console.error('Error disconnecting Discogs:', error);
          return Response.json(
            { error: 'Failed to disconnect' },
            { status: 500 },
          );
        }
      },
    },
  },
});
