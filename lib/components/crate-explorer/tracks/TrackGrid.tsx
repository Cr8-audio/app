import { DiscogsSearchResult } from '@/lib/types';
import TrackDisplay from './TrackDisplay';
import { usePlayerStore } from '@/lib/stores';
import { createTemporaryTrackForPlayback } from '@/lib/utils/track-conversion';
import { toast } from 'sonner';
import { useState } from 'react';

interface TrackGridProps {
  viewMode: 'grid' | 'list';
  items: DiscogsSearchResult[];
}

const TrackGrid = ({ viewMode, items }: TrackGridProps) => {
  const { playingTrackId, togglePlayPause, setQueue } = usePlayerStore();
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  const handlePlayToggle = async (result: DiscogsSearchResult) => {
    try {
      const tempTrack = createTemporaryTrackForPlayback(result);
      setLoadingTrackId(tempTrack.id);
      setQueue([tempTrack], 0);
      const didStart = await togglePlayPause(tempTrack);
      if (!didStart) toast.error('No playable audio found for this release');
    } catch (error) {
      console.error('Error playing track:', error);
      toast.error('Failed to play track');
    } finally {
      setLoadingTrackId(null);
    }
  };
  return (
    <div
      className={
        viewMode === 'list'
          ? 'space-y-3'
          : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      }
    >
      {items.map((item) => {
        const tempTrack = createTemporaryTrackForPlayback(item);
        const isLoading = loadingTrackId === tempTrack.id;
        return (
          <TrackDisplay
            key={item.id}
            result={item}
            viewMode={viewMode}
            isPlaying={playingTrackId === tempTrack.id}
            isLoading={isLoading}
            onPlayToggle={() => void handlePlayToggle(item)}
            dateAdded={item.date_added || ''}
          />
        );
      })}
    </div>
  );
};

export default TrackGrid;
