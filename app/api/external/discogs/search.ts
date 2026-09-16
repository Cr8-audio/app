import { createFileRoute } from '@tanstack/react-router';
import { DiscogsSDK } from '@crate.ai/discogs-sdk';
import { parse } from 'cookie';
import type { SearchParams, SearchResult, SearchResponse } from '@/lib/types';

function buildSearchParams(originalQuery: string): SearchParams {
  const terms = originalQuery.trim().split(/\s+/);

  // If searching for a specific release (contains hyphen)
  if (originalQuery.includes('-')) {
    const [artist, title] = originalQuery.split('-').map((s) => s.trim());
    return {
      artist: artist,
      releaseTitle: title,
      type: 'release',
    };
  }

  // Multi-word search without hyphen
  if (terms.length > 1) {
    return {
      query: originalQuery,
      type: 'release',
      format: 'Vinyl',
    };
  }

  return {
    query: originalQuery,
    type: 'release',
  };
}

export const Route = createFileRoute('/api/external/discogs/search')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { query: originalQuery } = await request.json();

          if (!originalQuery?.trim()) {
            return Response.json(
              { error: 'Search query is required' },
              { status: 400 },
            );
          }

          const cookies = parse(request.headers.get('cookie') || '');
          const accessToken = cookies['access_token'];
          const accessTokenSecret = cookies['access_token_secret'];

          if (!accessToken || !accessTokenSecret) {
            return Response.json(
              { error: 'Authentication required' },
              { status: 401 },
            );
          }

          const sdk = new DiscogsSDK({
            DiscogsConsumerKey: import.meta.env.VITE_DISCOGS_CONSUMER_KEY || '',
            DiscogsConsumerSecret:
              import.meta.env.VITE_DISCOGS_CONSUMER_SECRET || '',
            userAgent: 'CrateApp/1.0 +https://crate.ai',
          });

          const tokenManager = sdk.auth.base.getTokenManager();
          await tokenManager.setAccessToken(accessToken);
          await tokenManager.setAccessTokenSecret(accessTokenSecret);

          const searchParams = buildSearchParams(originalQuery);

          const response = (await sdk.search.getSearchResults(
            searchParams,
          )) as unknown as SearchResponse;

          // Enhance relevance sorting
          const normalizedQuery = originalQuery.toLowerCase().trim();
          const terms = normalizedQuery.split(/\s+/);

          const sortedResults = [...response.results].sort(
            (a: SearchResult, b: SearchResult) => {
              const titleA = (a.title || '').toLowerCase();
              const titleB = (b.title || '').toLowerCase();

              // Match all terms
              const aMatchesAll = terms.every((term: string) =>
                titleA.includes(term.toLowerCase()),
              );
              const bMatchesAll = terms.every((term: string) =>
                titleB.includes(term.toLowerCase()),
              );

              if (aMatchesAll && !bMatchesAll) return -1;
              if (!aMatchesAll && bMatchesAll) return 1;

              // Count matching terms
              const aMatchCount = terms.filter((term: string) =>
                titleA.includes(term.toLowerCase()),
              ).length;
              const bMatchCount = terms.filter((term: string) =>
                titleB.includes(term.toLowerCase()),
              ).length;

              if (aMatchCount !== bMatchCount) {
                return bMatchCount - aMatchCount;
              }

              // Prefer matches at the start of the title
              const aStartsWithTerm = terms.some((term: string) =>
                titleA.startsWith(term.toLowerCase()),
              );
              const bStartsWithTerm = terms.some((term: string) =>
                titleB.startsWith(term.toLowerCase()),
              );

              if (aStartsWithTerm && !bStartsWithTerm) return -1;
              if (!aStartsWithTerm && bStartsWithTerm) return 1;

              return 0;
            },
          );

          return Response.json({
            results: sortedResults,
            pagination: response.pagination,
          });
        } catch (error) {
          console.error('Discogs search error:', error);
          return Response.json(
            { error: 'Failed to search Discogs' },
            { status: 500 },
          );
        }
      },
    },
  },
});
