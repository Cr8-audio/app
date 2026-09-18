import { TrackList } from './TrackList';
import { useEffect } from 'react';
import { usePlayerStore } from '@/lib/stores';
import type { CrateTrack } from '@/lib/types';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';

interface Props {
  releaseId: number;
}

const ReleaseTracks = ({ releaseId }: Props) => {
  const {
    isPlaying,
    playingTrackId,
    initializePlayer,
    setQueue,
    togglePlayPause,
  } = usePlayerStore();

  // Use Convex query instead of fetch
  const convexTracks = useQuery(api.tracks.getTracksByReleaseId, {
    releaseId: releaseId,
  });

  const loading = convexTracks === undefined;
  // Map Convex tracks to CrateTrack format
  const tracks: CrateTrack[] = (convexTracks || []).map((track) => ({
    ...track,
    id: track.id || track._id,
    _convexId: track._id,
  })) as CrateTrack[];

  useEffect(() => {
    void initializePlayer();
  }, [initializePlayer]);

  const handlePlayToggle = async (track: CrateTrack) => {
    try {
      const trackIndex = tracks.findIndex((item) => item.id === track.id);
      setQueue(tracks, trackIndex);
      const didStart = await togglePlayPause(track);
      if (!didStart) toast.error('No playable audio found for this track');
    } catch (err) {
      console.error('Failed to play track:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        <p>No tracks found for this release.</p>
      </div>
    );
  }

  return (
    <TrackList
      tracks={tracks}
      playingTrackId={isPlaying ? playingTrackId : null}
      onPlayToggle={handlePlayToggle}
    />
  );
};

export default ReleaseTracks;
