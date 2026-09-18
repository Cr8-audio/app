/**
 * Pure Discogs search helpers (moved from the old /api/external/discogs/search
 * route so the Convex action and tests share them).
 */
import type { SearchParams, SearchResult } from '@cr8.audio/discogs-sdk';

export function buildSearchParams(originalQuery: string): SearchParams {
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

/** Rank results so titles matching every term, then more terms, come first. */
export function rankSearchResults(
  originalQuery: string,
  results: SearchResult[],
): SearchResult[] {
  const normalizedQuery = originalQuery.toLowerCase().trim();
  const terms = normalizedQuery.split(/\s+/);

  return [...results].sort((a: SearchResult, b: SearchResult) => {
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
  });
}
