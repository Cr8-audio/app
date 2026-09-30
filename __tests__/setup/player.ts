import { vi } from 'vitest';
import { usePlayerStore } from '@/lib/stores';
import type { CrateTrack, YouTubePlayer } from '@/lib/types';

/** A track whose audio the server has verified, so playing it calls no API. */
export function track(
  id: string,
  fields: Partial<CrateTrack> = {},
): CrateTrack {
  return {
    id,
    discogs_release_id: id,
    youtube_video_id: `video-${id}`,
    audio_status: 'ready',
    title: `Track ${id}`,
    artist: 'Akufen',
    extra_artists: null,
    position: 'A1',
    duration: '3:17',
    genres: null,
    styles: null,
    artwork: null,
    created_at: null,
    ...fields,
  };
}

/** A track with no video yet: playing it searches YouTube. */
export const unmatched = (id: string) =>
  track(id, { youtube_video_id: null, audio_status: 'pending' });

/** Stand in for the YouTube iframe player, which jsdom can't load. */
export function installFakePlayer() {
  const player = {
    loadVideoById: vi.fn(),
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    stopVideo: vi.fn(),
    seekTo: vi.fn(),
    setVolume: vi.fn(),
    getCurrentTime: () => 0,
    getDuration: () => 197,
    destroy: vi.fn(),
  };
  usePlayerStore.setState({
    player: player as unknown as YouTubePlayer,
    isReady: true,
  });
  return player;
}

export const playingId = () => usePlayerStore.getState().currentTrack?.id;
