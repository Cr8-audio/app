import { describe, expect, it } from 'vitest';
import {
  createPlayOrder,
  nextPosition,
  nextShuffleCycle,
  previousPosition,
  removeFromOrder,
  spreadNeighbours,
  type PlayOrder,
} from '@/lib/player/playOrder';

/** A deterministic random source, so shuffles are reproducible. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

const byIndex = (index: number) => String(index);

/** Play through an order the way the player does, until it stops. */
function playThrough(start: PlayOrder, repeat: boolean, limit = 50) {
  const played = [start.order[start.position]];
  let current = start;
  while (played.length < limit) {
    const position = nextPosition(current, repeat);
    if (position === null) break;
    current = { ...current, position };
    played.push(current.order[position]);
  }
  return played;
}

describe('play order', () => {
  it('plays in queue order from the chosen track and stops at the end', () => {
    const order = createPlayOrder({
      length: 5,
      startIndex: 2,
      shuffle: false,
      keyOf: byIndex,
    });
    expect(playThrough(order, false)).toEqual([2, 3, 4]);
  });

  it('shuffles every track exactly once, starting with the chosen one, then stops', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const order = createPlayOrder({
        length: 8,
        startIndex: 5,
        shuffle: true,
        keyOf: byIndex,
        random: seeded(seed),
      });
      const played = playThrough(order, false);
      expect(played[0]).toBe(5);
      expect([...played].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    }
  });

  it('loops when repeating', () => {
    const order = createPlayOrder({
      length: 3,
      startIndex: 0,
      shuffle: false,
      keyOf: byIndex,
    });
    expect(playThrough(order, true, 7)).toEqual([0, 1, 2, 0, 1, 2, 0]);
    expect(previousPosition(order, true)).toBe(2);
    expect(previousPosition(order, false)).toBeNull();
  });

  it('keeps tracks from the same record apart when it can', () => {
    // Three records with two, two and three tracks.
    const records = ['a', 'a', 'b', 'b', 'c', 'c', 'c'];
    const keyOf = (index: number) => records[index];
    for (let seed = 1; seed <= 25; seed++) {
      const { order } = createPlayOrder({
        length: records.length,
        startIndex: 0,
        shuffle: true,
        keyOf,
        random: seeded(seed),
      });
      const neighboursFromSameRecord = order.filter(
        (index, i) => i > 0 && keyOf(index) === keyOf(order[i - 1]),
      );
      expect(neighboursFromSameRecord).toEqual([]);
    }
  });

  it('never moves the first track while spreading', () => {
    expect(spreadNeighbours([0, 1, 2], () => 'same')).toEqual([0, 1, 2]);
  });

  it('starts a new shuffle cycle without replaying the last track first', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const order = nextShuffleCycle({
        length: 4,
        lastIndex: 2,
        keyOf: byIndex,
        random: seeded(seed),
      });
      expect(order[0]).not.toBe(2);
      expect([...order].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it('drops a removed track and keeps pointing at the current one', () => {
    // Playing queue index 3, at position 2 of the order.
    const current = { order: [4, 1, 3, 0, 2], position: 2 };
    const next = removeFromOrder(current, 1);
    // Queue indices above 1 shift down by one.
    expect(next.order).toEqual([3, 2, 0, 1]);
    expect(next.order[next.position]).toBe(2);
  });
});
