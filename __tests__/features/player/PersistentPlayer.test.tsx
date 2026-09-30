import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PersistentPlayer from '@/lib/components/ui/persistent-player';
import { usePlayerStore } from '@/lib/stores';
import { installFakePlayer, track } from '../../setup/player';

vi.mock('@/lib/hooks/useFavorites', () => ({
  useFavorites: () => ({ toggleFavorite: vi.fn(), isFavorite: () => false }),
}));

const [a, b, c, x] = ['a', 'b', 'c', 'x'].map((id) => track(id));
const player = () => usePlayerStore.getState();

let youtube: ReturnType<typeof installFakePlayer>;

/** The player as it is 22 seconds into the first of three tracks. */
async function playFirstOfThree() {
  player().setQueue([a, b, c], 0);
  await player().playTrack(a);
  usePlayerStore.setState({ currentTime: 22, duration: 197 });
  return render(<PersistentPlayer />);
}

const titlesIn = (section: string) =>
  within(screen.getByRole('region', { name: section }))
    .getAllByRole('listitem')
    .map((row) => row.textContent);

beforeEach(() => {
  youtube = installFakePlayer();
});

afterEach(() => {
  player().reset();
});

describe('the player bar', () => {
  it('shows nothing until something is played or queued', () => {
    const { container } = render(<PersistentPlayer />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the elapsed and total time beside a seek slider', async () => {
    await playFirstOfThree();
    const slider = screen.getByRole('slider', { name: 'Seek through track' });
    expect(slider).toHaveValue('22');
    expect(slider).toHaveAttribute('max', '197');
    expect(screen.getByText('0:22')).toBeVisible();
    expect(screen.getByText('3:17')).toBeVisible();
  });

  it('seeks once, on release, when the slider is dragged', async () => {
    await playFirstOfThree();
    const slider = screen.getByRole('slider', { name: 'Seek through track' });

    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: '60' } });
    fireEvent.change(slider, { target: { value: '90' } });
    expect(screen.getByText('1:30')).toBeVisible();
    expect(youtube.seekTo).not.toHaveBeenCalled();

    fireEvent.pointerUp(slider);
    expect(youtube.seekTo).toHaveBeenCalledTimes(1);
    expect(youtube.seekTo).toHaveBeenCalledWith(90);
  });

  it('seeks straight away from the keyboard', async () => {
    await playFirstOfThree();
    fireEvent.change(screen.getByRole('slider', { name: /Seek/ }), {
      target: { value: '23' },
    });
    expect(youtube.seekTo).toHaveBeenCalledWith(23);
  });

  it('only offers "next" when something follows', async () => {
    player().setQueue([a], 0);
    await player().playTrack(a);
    render(<PersistentPlayer />);
    const next = screen.getByRole('button', { name: 'Play next track' });
    expect(next).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Turn repeat on' }));
    expect(next).toBeEnabled();
  });

  it('plays the next track from the button', async () => {
    await playFirstOfThree();
    fireEvent.click(screen.getByRole('button', { name: 'Play next track' }));
    expect(await screen.findByText('Track b')).toBeVisible();
    expect(youtube.loadVideoById).toHaveBeenLastCalledWith(
      expect.objectContaining({ videoId: 'video-b' }),
    );
  });

  it('starts the queue from the play button when nothing is playing', async () => {
    player().addToQueue(x);
    render(<PersistentPlayer />);
    expect(screen.getByText('Nothing playing')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Play current track' }));
    expect(await screen.findByText('Track x')).toBeVisible();
  });
});

describe('the queue panel', () => {
  it('lists the current track, then queued tracks, then the rest of the list', async () => {
    await playFirstOfThree();
    player().addToQueue(x);
    fireEvent.click(screen.getByRole('button', { name: 'Open play queue' }));

    expect(titlesIn('Now playing')).toEqual([
      expect.stringContaining('Track a'),
    ]);
    expect(titlesIn('Next in queue')).toEqual([
      expect.stringContaining('Track x'),
    ]);
    expect(titlesIn('Next up')).toEqual([
      expect.stringContaining('Track b'),
      expect.stringContaining('Track c'),
    ]);
  });

  it('follows the shuffled order, not the order of the list', async () => {
    await playFirstOfThree();
    usePlayerStore.setState({ playOrder: [0, 2, 1], orderPosition: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Open play queue' }));

    expect(titlesIn('Next up')).toEqual([
      expect.stringContaining('Track c'),
      expect.stringContaining('Track b'),
    ]);
  });

  it('shows the first fifty of a long list and counts the rest', async () => {
    const library = Array.from({ length: 1396 }, (_, i) => track(`t${i}`));
    player().setQueue(library, 0);
    await player().playTrack(library[0]);
    render(<PersistentPlayer />);
    fireEvent.click(screen.getByRole('button', { name: 'Open play queue' }));

    expect(titlesIn('Next up')).toHaveLength(50);
    expect(screen.getByText('and 1,345 more')).toBeVisible();
  });

  it('clears only what the listener queued', async () => {
    await playFirstOfThree();
    player().addToQueue(x);
    fireEvent.click(screen.getByRole('button', { name: 'Open play queue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear queue' }));

    expect(screen.queryByRole('region', { name: 'Next in queue' })).toBeNull();
    expect(titlesIn('Next up')).toHaveLength(2);
    expect(player().currentTrack?.id).toBe('a');
  });
});
