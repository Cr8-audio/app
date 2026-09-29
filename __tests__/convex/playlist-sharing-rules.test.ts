import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUDIO_RECHECK_AFTER_MS,
  SHARE_ID_LENGTH,
  generateShareId,
  needsAudioCheck,
  playlistVisibility,
  trackAudioStatus,
} from '@/convex/lib/playlistSharing';
import {
  buildYouTubeTrackQuery,
  checkYouTubeVideos,
  rankYouTubeCandidates,
} from '@/convex/lib/youtubeApi';

describe('playlist visibility', () => {
  it.each([
    [{ is_public: true }, 'public'],
    [{ is_public: 't' }, 'public'],
    [{ is_public: 'f' }, 'private'],
    [{}, 'private'],
    [{ visibility: 'unlisted' as const, is_public: true }, 'unlisted'],
    [{ visibility: 'public' as const, is_favorites: 't' }, 'private'],
  ])('resolves %o to %s', (playlist, expected) => {
    expect(playlistVisibility(playlist)).toBe(expected);
  });
});

describe('share IDs', () => {
  it('are 12 URL-safe characters', () => {
    const id = generateShareId();
    expect(id).toHaveLength(SHARE_ID_LENGTH);
    expect(id).toMatch(/^[0-9A-Za-z]+$/);
  });

  it('skips bytes that would bias the alphabet', () => {
    // 248..255 must be rejected; 0 → "0", 61 → "z", 62 → "0" again.
    const bytes = [255, 248, 0, 61, 62, ...Array(19).fill(1)];
    const id = generateShareId((array) => {
      array.set(bytes.slice(0, array.length));
      return array;
    });
    expect(id.slice(0, 3)).toBe('0z0');
  });
});

describe('track audio status', () => {
  const now = Date.UTC(2026, 8, 29);

  it.each([
    [{ youtube_video_id: 'abc', youtube_checked_at: now }, 'ready'],
    [{ youtube_video_id: 'abc' }, 'unverified'],
    [{}, 'pending'],
    [{ youtube_checked_at: now }, 'unavailable'],
  ])('reads %o as %s', (track, expected) => {
    expect(trackAudioStatus(track)).toBe(expected);
  });

  it('rechecks tracks with no match only after a while', () => {
    expect(needsAudioCheck({ youtube_video_id: 'abc' }, now)).toBe(true);
    expect(
      needsAudioCheck({ youtube_video_id: 'abc', youtube_checked_at: 1 }, now),
    ).toBe(false);
    expect(needsAudioCheck({ youtube_checked_at: now - 1000 }, now)).toBe(
      false,
    );
    expect(
      needsAudioCheck(
        { youtube_checked_at: now - AUDIO_RECHECK_AFTER_MS - 1 },
        now,
      ),
    ).toBe(true);
  });
});

describe('YouTube helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('drops Discogs disambiguators from the search query', () => {
    expect(
      buildYouTubeTrackQuery({ artist: 'Intense (2)', title: 'Truth' }),
    ).toBe('Intense "Truth" audio');
  });

  it('keeps only confident matches, best first', () => {
    const ranked = rankYouTubeCandidates(
      { artist: 'Akufen', title: 'Deck The House' },
      [
        { id: { videoId: 'recipe' }, snippet: { title: 'Pickling recipe' } },
        {
          id: { videoId: 'plain' },
          snippet: { title: 'Deck The House', channelTitle: 'Akufen' },
        },
        {
          id: { videoId: 'best' },
          snippet: {
            title: 'Akufen - Deck The House (Official Audio)',
            channelTitle: 'Akufen - Topic',
          },
        },
      ],
    );
    expect(ranked.map((match) => match.videoId)).toEqual(['best', 'plain']);
  });

  it('checks stored videos in one call and rejects unembeddable ones', async () => {
    const fetchMock = vi.fn(async (url: URL) => {
      expect(url.searchParams.get('id')).toBe('good,blocked,gone');
      return Response.json({
        items: [
          {
            id: 'good',
            snippet: { title: 'Akufen - Deck The House', categoryId: '10' },
            status: { embeddable: true },
          },
          {
            id: 'blocked',
            snippet: { title: 'Akufen - My Way', categoryId: '10' },
            status: { embeddable: false },
          },
        ],
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const passed = await checkYouTubeVideos('key', [
      { videoId: 'good', track: { artist: 'Akufen', title: 'Deck The House' } },
      { videoId: 'blocked', track: { artist: 'Akufen', title: 'My Way' } },
      { videoId: 'gone', track: { artist: 'Akufen', title: 'Skidoos' } },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect([...passed]).toEqual(['good']);
  });
});
