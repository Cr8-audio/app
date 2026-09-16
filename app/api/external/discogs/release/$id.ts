import { createFileRoute } from '@tanstack/react-router';
import { getDiscogsRelease } from '@/lib/api-clients/discogs';
import { parse } from 'cookie';

export const Route = createFileRoute('/api/external/discogs/release/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const cookiesList = parse(request.headers.get('cookie') || '');
          const ip = request.headers.get('x-forwarded-for') || 'unknown';
          const accessToken = cookiesList['access_token'];
          const accessTokenSecret = cookiesList['access_token_secret'];

          if (!accessToken || !accessTokenSecret) {
            return Response.json(
              { error: 'Authentication required' },
              { status: 401 },
            );
          }

          const { release, remaining, reset, isLimited } =
            await getDiscogsRelease(
              accessToken,
              accessTokenSecret,
              ip,
              params.id,
            );

          if (isLimited) {
            return Response.json(
              { error: 'Rate limit exceeded' },
              {
                status: 429,
                headers: {
                  'X-RateLimit-Limit': '60',
                  'X-RateLimit-Remaining': '0',
                  'X-RateLimit-Reset': reset.toString(),
                },
              },
            );
          }

          return Response.json(release, {
            headers: {
              'X-RateLimit-Limit': '60',
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            },
          });
        } catch (error) {
          console.error('Discogs release fetch error:', error);
          return Response.json(
            { error: 'Failed to fetch release details' },
            { status: 500 },
          );
        }
      },
    },
  },
});
