/**
 * The order a queue plays in, kept apart from the YouTube player so shuffle
 * and repeat can be tested directly.
 *
 * `order` lists queue indices in play order and `position` points at the
 * current track. In order, `order` is just 0..n-1. With shuffle, the track
 * that was playing goes first and the rest follow in random order, spread so
 * that tracks from the same record don't play back to back when avoidable.
 */

export interface PlayOrder {
  order: number[];
  position: number;
}

export type Random = () => number;
/** Tracks with the same key shouldn't play back to back when shuffled. */
export type KeyOf = (index: number) => string;

function shuffled(items: number[], random: Random): number[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Could `n` tracks with these key counts follow a track with `lastKey`
 * without two of the same key meeting? A key other than `lastKey` fits in
 * every other slot from the first; `lastKey` itself can't take the first.
 */
function canKeepApart(
  counts: Map<string, number>,
  n: number,
  lastKey: string,
): boolean {
  for (const [key, count] of counts) {
    const limit = key === lastKey ? Math.floor(n / 2) : Math.ceil(n / 2);
    if (count > limit) return false;
  }
  return true;
}

/**
 * Rebuild the order after its first track (which never moves), taking tracks
 * in their existing (shuffled) order but passing over any that would follow
 * a track with the same key, or that would leave no way to keep the rest
 * apart. When keeping them apart is impossible, the existing order wins.
 */
export function spreadNeighbours(order: number[], keyOf: KeyOf): number[] {
  if (order.length < 3) return [...order];
  const result = [order[0]];
  const remaining = order.slice(1);
  const counts = new Map<string, number>();
  for (const index of remaining) {
    const key = keyOf(index);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  while (remaining.length > 0) {
    const previousKey = keyOf(result[result.length - 1]);
    const choice = remaining.findIndex((index) => {
      const key = keyOf(index);
      if (key === previousKey) return false;
      counts.set(key, counts.get(key)! - 1);
      const fits = canKeepApart(counts, remaining.length - 1, key);
      counts.set(key, counts.get(key)! + 1);
      return fits;
    });
    const [index] = remaining.splice(Math.max(choice, 0), 1);
    const key = keyOf(index);
    counts.set(key, counts.get(key)! - 1);
    result.push(index);
  }
  return result;
}

export function createPlayOrder({
  length,
  startIndex,
  shuffle,
  keyOf,
  random = Math.random,
}: {
  length: number;
  startIndex: number;
  shuffle: boolean;
  keyOf: KeyOf;
  random?: Random;
}): PlayOrder {
  const indices = Array.from({ length }, (_, i) => i);
  if (length === 0) return { order: [], position: 0 };
  const start = Math.min(Math.max(startIndex, 0), length - 1);
  if (!shuffle) return { order: indices, position: start };

  const rest = shuffled(
    indices.filter((index) => index !== start),
    random,
  );
  return { order: spreadNeighbours([start, ...rest], keyOf), position: 0 };
}

/**
 * A fresh shuffle for the next pass when repeating, so a looping embed
 * doesn't replay the same sequence. The track that just played never
 * comes straight back.
 */
export function nextShuffleCycle({
  length,
  lastIndex,
  keyOf,
  random = Math.random,
}: {
  length: number;
  lastIndex: number;
  keyOf: KeyOf;
  random?: Random;
}): number[] {
  const order = shuffled(
    Array.from({ length }, (_, i) => i),
    random,
  );
  if (order.length > 1 && order[0] === lastIndex) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return spreadNeighbours(order, keyOf);
}

/** The next position, or null at the end of the order when not repeating. */
export function nextPosition(
  { order, position }: PlayOrder,
  repeat: boolean,
): number | null {
  if (order.length === 0) return null;
  if (position + 1 < order.length) return position + 1;
  return repeat ? 0 : null;
}

/** The previous position, or null at the start when not repeating. */
export function previousPosition(
  { order, position }: PlayOrder,
  repeat: boolean,
): number | null {
  if (order.length === 0) return null;
  if (position > 0) return position - 1;
  return repeat ? order.length - 1 : null;
}

/** Drop a queue index from the order after the queue lost that track. */
export function removeFromOrder(
  { order, position }: PlayOrder,
  removedIndex: number,
): PlayOrder {
  const removedAt = order.indexOf(removedIndex);
  return {
    order: order
      .filter((index) => index !== removedIndex)
      .map((index) => (index > removedIndex ? index - 1 : index)),
    position:
      removedAt !== -1 && removedAt < position
        ? position - 1
        : Math.min(position, Math.max(order.length - 2, 0)),
  };
}
