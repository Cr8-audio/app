import { describe, expect, it } from 'vitest';
import {
  MAX_PAGE_SIZE,
  libraryOrder,
  libraryPage,
} from '@/convex/lib/libraryPage';

const tracks = [
  {
    title: 'Timemorf',
    artist: 'Ricardo Villalobos',
    genres: 'Electronic',
    styles: 'Minimal',
  },
  { title: 'bach to back', artist: 'Ricardo Villalobos', styles: 'Minimal' },
  { title: 'Deck The House', artist: 'Akufen', styles: 'Microhouse' },
  { title: 'Track 10', artist: 'Various' },
  { title: 'Track 2', artist: 'Various' },
];

describe('library pages', () => {
  it('pages in collection order and reports totals', () => {
    const page = libraryPage(tracks, { pageIndex: 1, pageSize: 2 });
    expect(page).toMatchObject({
      total: 5,
      filteredTotal: 5,
      pageIndex: 1,
      pageCount: 3,
    });
    expect(page.tracks.map((track) => track.title)).toEqual([
      'Deck The House',
      'Track 10',
    ]);
  });

  it('searches title, artist, genres and styles, ignoring case', () => {
    const titles = (search: string) =>
      libraryPage(tracks, { search, pageIndex: 0, pageSize: 10 }).tracks.map(
        (track) => track.title,
      );
    expect(titles('VILLALOBOS')).toEqual(['Timemorf', 'bach to back']);
    expect(titles('microhouse')).toEqual(['Deck The House']);
    expect(titles('electronic')).toEqual(['Timemorf']);
    expect(titles('  ')).toHaveLength(5);
  });

  it('sorts case-insensitively with numbers in order, both ways', () => {
    const sorted = (sortDesc: boolean) =>
      libraryPage(tracks, {
        sortBy: 'title',
        sortDesc,
        pageIndex: 0,
        pageSize: 10,
      }).tracks.map((track) => track.title);
    expect(sorted(false)).toEqual([
      'bach to back',
      'Deck The House',
      'Timemorf',
      'Track 2',
      'Track 10',
    ]);
    expect(sorted(true)[0]).toBe('Track 10');
  });

  it('gives the player every match in the same order, unpaged', () => {
    const order = { search: 'a', sortBy: 'title', sortDesc: true } as const;
    const paged = [0, 1, 2].flatMap(
      (pageIndex) =>
        libraryPage(tracks, { ...order, pageIndex, pageSize: 2 }).tracks,
    );
    expect(libraryOrder(tracks, order)).toEqual(paged);
    expect(paged.map((track) => track.title)).toEqual([
      'Track 10',
      'Track 2',
      'Timemorf',
      'Deck The House',
      'bach to back',
    ]);
  });

  it('clamps a page past the end and an oversized page size', () => {
    expect(libraryPage(tracks, { pageIndex: 9, pageSize: 2 }).pageIndex).toBe(
      2,
    );
    const big = Array.from({ length: 150 }, (_, index) => ({
      title: `Track ${index}`,
      artist: 'Various',
    }));
    expect(
      libraryPage(big, { pageIndex: 0, pageSize: 1000 }).tracks,
    ).toHaveLength(MAX_PAGE_SIZE);
  });
});
