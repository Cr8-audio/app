import { renderHook } from '@testing-library/react';
import { useAction } from 'convex/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedAudio } from '@/convex/trackAudio';
import {
  searchTrackVideo,
  validateTrackVideo,
} from '@/lib/api-clients/youtube/service';
import { useServerAudio } from '@/lib/player/useServerAudio';
import { setServerAudio, usePlayerStore } from '@/lib/stores/musicPlayerStore';
import type { CrateTrack, YouTubePlayer } from '@/lib/types';

vi.mock('convex/react', () => ({ useAction: vi.fn() }));
vi.mock('@/lib/api-clients/youtube/service', () => ({
  searchTrackVideo: vi.fn(),
  validateTrackVideo: vi.fn(),
}));

function track(id: string, fields: Partial<CrateTrack> = {}): CrateTrack {
  return {
    id,
    discogs_release_id: id,
    youtube_video_id: null,
    audio_status: 'pending',
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

const player = () => usePlayerStore.getState();
const server = vi.fn<(trackId: string) => Promise<ResolvedAudio>>();
// Stands in for the YouTube iframe player, which jsdom can't load.
const youtube = {
  loadVideoById: vi.fn(),
  playVideo: vi.fn(),
  getCurrentTime: () => 0,
  getDuration: () => 197,
  destroy: vi.fn(),
};
const loadedVideo = () => youtube.loadVideoById.mock.lastCall?.[0].videoId;

beforeEach(() => {
  usePlayerStore.setState({
    player: youtube as unknown as YouTubePlayer,
    isReady: true,
  });
  setServerAudio(server);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  player().reset();
  setServerAudio(null);
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe('finding audio through the server', () => {
  it('plays the video the server found, without a search from the browser', async () => {
    server.mockResolvedValue({ status: 'ready', videoId: 'from-server' });

    expect(await player().playTrack(track('a'))).toBe(true);
    expect(server).toHaveBeenCalledWith('a');
    expect(loadedVideo()).toBe('from-server');
    expect(searchTrackVideo).not.toHaveBeenCalled();
    expect(validateTrackVideo).not.toHaveBeenCalled();
  });

  it('asks once per track in a visit', async () => {
    server.mockResolvedValue({ status: 'ready', videoId: 'from-server' });
    const a = track('a');
    player().setQueue([a], 0);

    await player().playTrack(a);
    await player().playTrack(a);
    expect(server).toHaveBeenCalledTimes(1);
  });

  it('has a stored video checked by the server, not by the browser', async () => {
    server.mockResolvedValue({ status: 'ready', videoId: 'stored' });
    const unverified = track('a', {
      youtube_video_id: 'stored',
      audio_status: 'unverified',
    });

    expect(await player().playTrack(unverified)).toBe(true);
    expect(validateTrackVideo).not.toHaveBeenCalled();
  });

  it('skips the server for a track it has already verified', async () => {
    const ready = track('a', {
      youtube_video_id: 'verified',
      audio_status: 'ready',
    });

    expect(await player().playTrack(ready)).toBe(true);
    expect(server).not.toHaveBeenCalled();
    expect(loadedVideo()).toBe('verified');
  });

  it('does not play, or search again, when the server found no match', async () => {
    server.mockResolvedValue({ status: 'no-match' });

    expect(await player().playTrack(track('a'))).toBe(false);
    expect(searchTrackVideo).not.toHaveBeenCalled();
  });

  it('does not fall back to a browser search when the quota is used up', async () => {
    server.mockResolvedValue({ status: 'quota' });

    expect(await player().playTrack(track('a'))).toBe(false);
    expect(searchTrackVideo).not.toHaveBeenCalled();
  });

  it.each([
    ['the track is not a stored one', () => ({ status: 'unhandled' as const })],
    [
      'the server cannot be reached',
      () => {
        throw new Error('Could not find public function');
      },
    ],
  ])('searches from the browser when %s', async (_why, answer) => {
    server.mockImplementation(async () => answer());
    vi.mocked(searchTrackVideo).mockResolvedValue('from-browser');

    expect(await player().playTrack(track('external_1'))).toBe(true);
    expect(loadedVideo()).toBe('from-browser');
  });

  it('searches from the browser when nobody is signed in', async () => {
    setServerAudio(null);
    vi.mocked(searchTrackVideo).mockResolvedValue('from-browser');

    expect(await player().playTrack(track('a'))).toBe(true);
    expect(server).not.toHaveBeenCalled();
    expect(loadedVideo()).toBe('from-browser');
  });
});

describe('who gets audio through the server', () => {
  it('is whoever is signed in, until they sign out', async () => {
    setServerAudio(null);
    const action = vi.fn().mockResolvedValue({
      status: 'ready',
      videoId: 'from-server',
    });
    vi.mocked(useAction).mockReturnValue(
      action as unknown as ReturnType<typeof useAction>,
    );
    vi.mocked(searchTrackVideo).mockResolvedValue('from-browser');

    const { rerender } = renderHook(
      ({ isSignedIn }) => useServerAudio(isSignedIn),
      { initialProps: { isSignedIn: true } },
    );
    await player().playTrack(track('a'));
    expect(action).toHaveBeenCalledWith({ trackId: 'a' });
    expect(loadedVideo()).toBe('from-server');

    rerender({ isSignedIn: false });
    await player().playTrack(track('b'));
    expect(action).toHaveBeenCalledTimes(1);
    expect(loadedVideo()).toBe('from-browser');
  });
});
