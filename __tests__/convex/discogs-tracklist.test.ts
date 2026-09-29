import { describe, expect, it } from 'vitest';
import {
  artistCreditName,
  assignReleaseVideos,
  tracksFromRelease,
} from '@/convex/lib/discogsTracklist';

describe('Discogs artist credits', () => {
  it.each([
    [[{ name: 'Tiga' }, { name: 'Zyntherius' }], 'Tiga, Zyntherius'],
    [
      [
        { name: 'Miss Kittin', join: '&' },
        { name: 'The Hacker', join: '' },
      ],
      'Miss Kittin & The Hacker',
    ],
    [
      [
        { name: 'Pépé Bradock', anv: 'Pepe Bradock', join: 'Feat.' },
        { name: 'X' },
      ],
      'Pepe Bradock Feat. X',
    ],
    [[{ name: 'Andy Hay (2)' }], 'Andy Hay (2)'],
  ])('names %j as %s', (credits, expected) => {
    expect(artistCreditName(credits)).toBe(expected);
  });
});

describe('tracks from a Discogs release', () => {
  const release = {
    id: 18500,
    artists: [{ name: 'Tiga', join: ',' }, { name: 'Zyntherius' }],
    genres: ['Electronic'],
    styles: ['Electroclash', 'Techno'],
    tracklist: [
      { type_: 'heading', title: 'Side A', position: '' },
      {
        type_: 'track',
        position: 'A',
        title: 'Sunglasses At Night ',
        duration: '5:12',
      },
      {
        type_: 'track',
        position: 'B',
        title: 'Sunglasses At Night (Chris Liebing Mix)',
        duration: '8:57',
        extraartists: [{ name: 'Chris Liebing' }, { name: 'Chris Liebing' }],
      },
      {
        type_: 'index',
        title: 'Bonus',
        sub_tracks: [
          {
            type_: 'track',
            position: 'C1',
            title: 'Hot In Herre',
            artists: [{ name: 'Tiga' }],
          },
        ],
      },
    ],
    videos: [
      {
        uri: 'https://www.youtube.com/watch?v=liebing123',
        title: 'Tiga & Zyntherius - Sunglasses At Night (Chris Liebing Mix)',
      },
      {
        uri: 'https://www.youtube.com/watch?v=recipe12345',
        title: 'Pickled beets recipe',
      },
    ],
  };

  it('keeps playable tracks in the migrated format', () => {
    expect(tracksFromRelease(release, 'https://img/cover.jpg')).toEqual([
      {
        title: 'Sunglasses At Night',
        artist: 'Tiga, Zyntherius',
        position: 'A',
        duration: '5:12',
        genres: 'Electronic',
        styles: 'Electroclash,Techno',
        artwork: 'https://img/cover.jpg',
      },
      {
        title: 'Sunglasses At Night (Chris Liebing Mix)',
        artist: 'Tiga, Zyntherius',
        extra_artists: 'Chris Liebing',
        position: 'B',
        duration: '8:57',
        genres: 'Electronic',
        styles: 'Electroclash,Techno',
        artwork: 'https://img/cover.jpg',
        youtube_video_id: 'liebing123',
      },
      {
        title: 'Hot In Herre',
        artist: 'Tiga',
        position: 'C1',
        duration: '',
        genres: 'Electronic',
        styles: 'Electroclash,Techno',
        artwork: 'https://img/cover.jpg',
      },
    ]);
  });

  it('only takes a release video that matches the track', () => {
    expect(
      assignReleaseVideos(
        [{ artist: 'Akufen', title: 'Pickled Beets' }],
        release.videos,
      ),
    ).toEqual([undefined]);
    expect(
      assignReleaseVideos(
        [{ artist: 'Akufen', title: 'Deck The House' }],
        [
          {
            uri: 'https://youtu.be/deckhouse01',
            title: 'Akufen - Deck The House',
          },
        ],
      ),
    ).toEqual(['deckhouse01']);
  });

  it('gives a remix video to the remix, not the original mix', () => {
    expect(
      assignReleaseVideos(
        [
          { artist: 'Tiga', title: 'Sunglasses At Night' },
          { artist: 'Tiga', title: 'Sunglasses At Night (Chris Liebing Mix)' },
        ],
        [
          {
            uri: 'https://www.youtube.com/watch?v=original123',
            title: 'Tiga - Sunglasses At Night',
          },
          {
            uri: 'https://www.youtube.com/watch?v=liebing123',
            title: 'Tiga - Sunglasses At Night (Chris Liebing Mix)',
          },
        ],
      ),
    ).toEqual(['original123', 'liebing123']);
  });

  it('returns nothing for a release without a tracklist', () => {
    expect(tracksFromRelease({ id: 1 })).toEqual([]);
  });
});
