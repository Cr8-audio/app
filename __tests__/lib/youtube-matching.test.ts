import { describe, expect, it } from 'vitest';
import { evaluateYouTubeCandidate } from '@/convex/lib/youtubeMatching';

describe('YouTube track matching', () => {
  it('rejects the pickled-beets recipe that triggered the production bug', () => {
    const result = evaluateYouTubeCandidate(
      { artist: 'Akufen', title: 'Pickled Beets' },
      {
        title: 'The best, easiest recipe for pickled beets!',
        channelTitle: 'Jam Jar Kitchen',
        description: 'A simple canning recipe from the garden.',
        categoryId: '26',
      },
    );

    expect(result.matches).toBe(false);
  });

  it('accepts a music result with matching artist and title', () => {
    const result = evaluateYouTubeCandidate(
      { artist: 'Akufen', title: 'Pickled Beets' },
      {
        title: 'Akufen - Pickled Beets',
        channelTitle: 'Akufen - Topic',
        description: 'Provided to YouTube by the label.',
        categoryId: '10',
      },
    );

    expect(result.matches).toBe(true);
    expect(result.score).toBeGreaterThan(80);
  });

  it('rejects the right generic title by the wrong artist', () => {
    const result = evaluateYouTubeCandidate(
      { artist: 'Intense', title: 'Holding On' },
      {
        title: 'Holding On (Official Audio)',
        channelTitle: 'Some Other Artist',
        categoryId: '10',
      },
    );

    expect(result).toMatchObject({
      matches: false,
      reason: 'artist-mismatch',
    });
  });

  it('allows an unknown artist when the title and category match', () => {
    const result = evaluateYouTubeCandidate(
      { artist: 'Unknown Artist', title: 'Jerzzy Walking' },
      {
        title: 'Jerzzy Walking (Vinyl Rip)',
        channelTitle: 'Deep House Archive',
        categoryId: '10',
      },
    );

    expect(result.matches).toBe(true);
  });

  it('rejects non-music categories even with matching words', () => {
    const result = evaluateYouTubeCandidate(
      { artist: 'Akufen', title: 'Pickled Beets' },
      {
        title: 'Akufen Pickled Beets',
        channelTitle: 'Kitchen Experiments',
        categoryId: '26',
      },
    );

    expect(result).toMatchObject({ matches: false, reason: 'not-music' });
  });

  it('accepts a record shop upload filed outside Music when it names the artist and title', () => {
    const result = evaluateYouTubeCandidate(
      { artist: 'Tripmastaz', title: '4erti' },
      {
        title: 'A. Tripmastaz - 4erti [TARTOUFFE011-1]',
        channelTitle: 'Yoyaku Record Store',
        categoryId: '1',
      },
    );

    expect(result.matches).toBe(true);
  });

  it.each([
    [
      'the artist is missing',
      { artist: 'Tripmastaz', title: '4erti' },
      'Various - 4erti',
    ],
    [
      'the artist is generic',
      { artist: 'Various', title: 'Inercia' },
      'Various - Inercia',
    ],
  ])(
    'rejects a loose-category upload when %s',
    (_case, track, candidateTitle) => {
      const result = evaluateYouTubeCandidate(track, {
        title: candidateTitle,
        channelTitle: 'Some Channel',
        categoryId: '22',
      });

      expect(result.matches).toBe(false);
    },
  );
});
