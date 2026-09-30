import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchTrackVideo } from '@/lib/api-clients/youtube/service';
import { extendQueue } from '@/lib/player/extendQueue';
import { usePlayerStore } from '@/lib/stores';
import {
  installFakePlayer,
  playingId,
  track,
  unmatched,
} from '../setup/player';

vi.mock('@/lib/api-clients/youtube/service', () => ({
  searchTrackVideo: vi.fn(),
  validateTrackVideo: vi.fn(),
}));

const player = () => usePlayerStore.getState();
const [a, b, c, x] = ['a', 'b', 'c', 'x'].map((id) => track(id));

let youtube: ReturnType<typeof installFakePlayer>;

beforeEach(() => {
  youtube = installFakePlayer();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  player().reset();
  vi.mocked(searchTrackVideo).mockReset();
  vi.restoreAllMocks();
});

describe('playing through a list', () => {
  it('moves to the next and previous track and stops at the end', async () => {
    player().setQueue([a, b, c], 0);
    await player().playTrack(a);

    expect(await player().playNext()).toBe(true);
    expect(playingId()).toBe('b');
    await player().playNext();
    expect(playingId()).toBe('c');
    expect(await player().playNext()).toBe(false);
    expect(playingId()).toBe('c');
    expect(player().playbackIssue).toBeNull();

    await player().playPrevious();
    expect(playingId()).toBe('b');
  });

  it('restarts a track that is past its first seconds on "previous"', async () => {
    player().setQueue([a, b, c], 1);
    await player().playTrack(b);
    usePlayerStore.setState({ currentTime: 42 });

    await player().playPrevious();
    expect(playingId()).toBe('b');
    expect(youtube.seekTo).toHaveBeenCalledWith(0);

    await player().playPrevious();
    expect(playingId()).toBe('a');
  });
});

describe('tracks the listener queued', () => {
  it('play next, then the list carries on from where it was', async () => {
    player().setQueue([a, b, c], 0);
    await player().playTrack(a);
    player().addToQueue(x);
    // Also in the list: queueing it must not move the list's place to it.
    player().addToQueue(c);

    const played = [];
    while (await player().playNext()) played.push(playingId());
    expect(played).toEqual(['x', 'c', 'b', 'c']);
    expect(player().upNext).toEqual([]);
  });

  it('go back to the track they followed on "previous"', async () => {
    player().setQueue([a, b, c], 1);
    await player().playTrack(b);
    player().addToQueue(x);
    await player().playNext();
    expect(playingId()).toBe('x');

    await player().playPrevious();
    expect(playingId()).toBe('b');
    await player().playNext();
    expect(playingId()).toBe('c');
  });

  it('are not queued twice, and can be removed or played out of turn', async () => {
    player().setQueue([a], 0);
    await player().playTrack(a);
    [x, x, b, c].forEach((queued) => player().addToQueue(queued));
    expect(player().upNext.map((queued) => queued.id)).toEqual(['x', 'b', 'c']);

    player().removeFromUpNext('b');
    await player().playUpNext('c');
    expect(playingId()).toBe('c');
    expect(player().upNext.map((queued) => queued.id)).toEqual(['x']);
  });

  it('survive a new list being played', async () => {
    player().addToQueue(x);
    player().setQueue([a, b], 0);
    await player().playTrack(a);

    await player().playNext();
    expect(playingId()).toBe('x');
    await player().playNext();
    expect(playingId()).toBe('b');
  });

  it('start from the play button when nothing else is loaded', async () => {
    player().addToQueue(x);
    expect(await player().playNext()).toBe(true);
    expect(playingId()).toBe('x');
  });
});

describe('tracks without audio', () => {
  it('are passed over', async () => {
    vi.mocked(searchTrackVideo).mockResolvedValue(null);
    player().setQueue([a, unmatched('p1'), unmatched('p2'), c], 0);
    await player().playTrack(a);

    expect(await player().playNext()).toBe(true);
    expect(playingId()).toBe('c');
    expect(searchTrackVideo).toHaveBeenCalledTimes(2);
  });

  it('stop "next" after ten in a row, and it says so', async () => {
    vi.mocked(searchTrackVideo).mockResolvedValue(null);
    const dead = Array.from({ length: 30 }, (_, i) => unmatched(`p${i}`));
    player().setQueue([a, ...dead], 0);
    await player().playTrack(a);

    expect(await player().playNext()).toBe(false);
    expect(searchTrackVideo).toHaveBeenCalledTimes(10);
    expect(player().playbackIssue).toEqual({ reason: 'no-audio' });
    expect(playingId()).toBe('a');
  });

  it('are not searched one after another when the search itself is failing', async () => {
    vi.mocked(searchTrackVideo).mockRejectedValue(new Error('quota'));
    const pending = Array.from({ length: 5 }, (_, i) => unmatched(`p${i}`));
    player().setQueue([a, ...pending], 0);
    await player().playTrack(a);

    player().addToQueue(unmatched('queued'));

    expect(await player().playNext()).toBe(false);
    expect(searchTrackVideo).toHaveBeenCalledTimes(1);
    expect(player().playbackIssue).toEqual({ reason: 'unavailable' });

    // The track that was playing still is, and the same one is tried again.
    expect(player()).toMatchObject({ isPlaying: true, orderPosition: 0 });
    expect(playingId()).toBe('a');
    vi.mocked(searchTrackVideo).mockResolvedValue('found');
    await player().playNext();
    expect(playingId()).toBe('queued');
    expect(player().playbackIssue).toBeNull();
  });
});

describe('a list shown one page at a time', () => {
  const all = ['a', 'b', 'c', 'd', 'e'].map((id) => track(id));
  const page = all.slice(0, 2);

  it('plays on past the page once the rest has loaded', async () => {
    player().setQueue(page, 1);
    await player().playTrack(page[1]);

    expect(extendQueue(page, all)).toBe(true);
    expect(playingId()).toBe('b');
    await player().playNext();
    expect(playingId()).toBe('c');
    await player().playPrevious();
    await player().playPrevious();
    expect(playingId()).toBe('a');
  });

  it('keeps its place when the listener moved on before the rest loaded', async () => {
    player().setQueue(page, 0);
    await player().playTrack(page[0]);
    await player().playNext();

    extendQueue(page, all);
    await player().playNext();
    expect(playingId()).toBe('c');
  });

  it('shuffles the whole list around the track that is playing', async () => {
    player().setShuffle(true);
    player().setQueue(page, 1);
    await player().playTrack(page[1]);
    extendQueue(page, all);

    const { queue, playOrder, orderPosition } = player();
    expect(queue[playOrder[orderPosition]].id).toBe('b');
    expect([...playOrder].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('leaves the queue alone when something else was played meanwhile', async () => {
    player().setQueue(page, 0);
    await player().playTrack(page[0]);
    player().setQueue([x], 0);

    expect(extendQueue(page, all)).toBe(false);
    expect(player().queue).toEqual([x]);
  });
});
