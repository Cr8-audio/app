import { useState, useMemo } from 'react';
import type { CrateTrack } from '@/lib/types';
import { OrderingConfig } from '@/lib/types';

export function useTrackSorting(tracks: CrateTrack[]) {
  const [orderingConfig, setOrderingConfig] = useState<OrderingConfig>({
    orderBy: 'manual',
    direction: 'asc',
  });

  // Pure: no state updates in here (they made the chat page re-render forever).
  const sortedTracks = useMemo(() => {
    const sorted = [...tracks];
    const sign = orderingConfig.direction === 'asc' ? 1 : -1;
    switch (orderingConfig.orderBy) {
      case 'bpm':
        return sorted.sort((a, b) => sign * (Number(a.bpm) - Number(b.bpm)));
      case 'genre':
        return sorted.sort(
          (a, b) =>
            sign *
            (a.genres ?? '')
              .toLowerCase()
              .localeCompare((b.genres ?? '').toLowerCase()),
        );
      default:
        return sorted;
    }
  }, [tracks, orderingConfig]);

  return {
    sortedTracks,
    orderingConfig,
    setOrderingConfig,
  };
}
