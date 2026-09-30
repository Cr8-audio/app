import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useConvex, useQuery } from 'convex/react';
import { getFunctionName } from 'convex/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TracksTable from '@/lib/components/crate-explorer/tracks/TracksTable';
import { usePlayerStore } from '@/lib/stores';
import { installFakePlayer, playingId, track } from '../../setup/player';

vi.mock('convex/react', () => ({ useQuery: vi.fn(), useConvex: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useParams: () => ({ username: 'paprika' }),
}));
vi.mock('@/lib/hooks/usePlaylists', () => ({
  usePlaylists: () => ({ playlists: [], isLoading: false }),
}));
vi.mock('@/lib/hooks/useFavorites', () => ({
  useFavorites: () => ({ toggleFavorite: vi.fn(), isFavorite: () => false }),
}));

// A library of 25 tracks, shown ten to a page.
const library = Array.from({ length: 25 }, (_, i) => track(`t${i}`));
const page = library.slice(0, 10);
const player = () => usePlayerStore.getState();
const loadLibrary = vi.fn();

/** Click the play button on a row of the table. */
const playRow = (title: string) =>
  fireEvent.click(
    screen
      .getByRole('row', { name: new RegExp(title) })
      .querySelector('button[aria-label="Play track"]')!,
  );

beforeEach(() => {
  installFakePlayer();
  loadLibrary.mockResolvedValue(library);
  vi.mocked(useConvex).mockReturnValue({
    query: loadLibrary,
  } as unknown as ReturnType<typeof useConvex>);
  vi.mocked(useQuery).mockImplementation(((query: never) =>
    getFunctionName(query) === 'tracks:listLibrary'
      ? {
          tracks: page,
          total: 25,
          filteredTotal: 25,
          pageIndex: 0,
          pageCount: 3,
        }
      : { total: 3, ready: 3, minutesLeft: 0 }) as typeof useQuery);
});

afterEach(() => {
  player().reset();
  vi.clearAllMocks();
});

describe('playing from the library table', () => {
  it('plays on through the rest of the page and into the library', async () => {
    render(<TracksTable />);
    playRow('Track t8');

    await waitFor(() => expect(playingId()).toBe('t8'));
    await waitFor(() => expect(player().queue).toHaveLength(25));

    await player().playNext();
    expect(playingId()).toBe('t9');
    // Past the last row on screen.
    await player().playNext();
    expect(playingId()).toBe('t10');
  });

  it('asks for the library in the order the table shows it, once', async () => {
    render(<TracksTable />);
    playRow('Track t1');
    await waitFor(() => expect(playingId()).toBe('t1'));
    playRow('Track t4');
    await waitFor(() => expect(playingId()).toBe('t4'));

    expect(loadLibrary).toHaveBeenCalledTimes(1);
    const [query, args] = loadLibrary.mock.calls[0];
    expect(getFunctionName(query)).toBe('tracks:listLibraryQueue');
    expect(args).toEqual({
      search: undefined,
      sortBy: undefined,
      sortDesc: undefined,
    });
  });

  it('still plays the page when the rest of the library fails to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    loadLibrary.mockRejectedValue(new Error('offline'));
    render(<TracksTable />);
    playRow('Track t8');

    await waitFor(() => expect(playingId()).toBe('t8'));
    await player().playNext();
    expect(playingId()).toBe('t9');
    expect(player().queue).toHaveLength(10);
  });

  it('queues a track to play next without interrupting', async () => {
    render(<TracksTable />);
    playRow('Track t1');
    await waitFor(() => expect(playingId()).toBe('t1'));

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Add Track t7 to queue' })[0],
    );
    expect(playingId()).toBe('t1');
    await player().playNext();
    expect(playingId()).toBe('t7');
    await player().playNext();
    expect(playingId()).toBe('t2');
  });
});
