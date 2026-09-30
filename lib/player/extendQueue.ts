import { usePlayerStore } from '@/lib/stores';
import type { CrateTrack } from '@/lib/types';

/**
 * A list shown a page at a time still plays as one list. Playback starts
 * from the page on screen; once the whole list has loaded, it takes the
 * page's place in the queue, around the track that is playing. Does nothing
 * when the listener has started something else meanwhile.
 */
export function extendQueue(page: CrateTrack[], all: CrateTrack[]): boolean {
  const { queue, currentIndex, setQueue } = usePlayerStore.getState();
  const isStillQueued =
    queue.length === page.length &&
    queue.every((track, index) => track.id === page[index].id);
  if (!isStillQueued) return false;

  const index = all.findIndex((track) => track.id === queue[currentIndex]?.id);
  if (index === -1) return false;
  setQueue(all, index);
  return true;
}
