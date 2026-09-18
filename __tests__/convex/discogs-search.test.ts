import { describe, it, expect } from 'vitest';
import type { SearchResult } from '@cr8.audio/discogs-sdk';
import {
  buildSearchParams,
  rankSearchResults,
} from '@/convex/lib/discogsSearch';

describe('buildSearchParams', () => {
  it('splits "artist - title" into fields', () => {
    expect(
      buildSearchParams('Moodymann - Silence in the Secret Garden'),
    ).toEqual({
      artist: 'Moodymann',
      releaseTitle: 'Silence in the Secret Garden',
      type: 'release',
    });
  });

  it('searches vinyl releases for multi-word queries', () => {
    expect(buildSearchParams('deep burnt')).toEqual({
      query: 'deep burnt',
      type: 'release',
      format: 'Vinyl',
    });
  });

  it('keeps single-word queries broad', () => {
    expect(buildSearchParams('Bradock')).toEqual({
      query: 'Bradock',
      type: 'release',
    });
  });
});

describe('rankSearchResults', () => {
  const r = (title: string) => ({ title }) as SearchResult;

  it('puts titles matching every term first', () => {
    const ranked = rankSearchResults('deep burnt', [
      r('Deep Space'),
      r('Pépé Bradock - Deep Burnt'),
    ]);
    expect(ranked[0].title).toBe('Pépé Bradock - Deep Burnt');
  });
});
