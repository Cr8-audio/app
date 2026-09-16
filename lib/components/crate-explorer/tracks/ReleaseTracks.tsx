import { PlaybackError } from '@/lib/types';
import { TrackList } from './TrackList';
import { useEffect } from 'react';
import { usePlayerStore } from '@/lib/stores';
import { CrateTrack } from '@/lib/types';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface Props {
  releaseId: number;
}

const ReleaseTracks = ({ releaseId }: Props) => {
  const {
    player,
    isReady,
    playingTrackId,
    setPlayingTrackId,
    initializePlayer,
  } = usePlayerStore();

  // Use Convex query instead of fetch
  const convexTracks = useQuery(api.tracks.getTracksByReleaseId, {
    releaseId: releaseId,
  });

  const loading = convexTracks === undefined;
  const error = null; // Convex handles errors differently

  // Map Convex tracks to CrateTrack format
  const tracks: CrateTrack[] = (convexTracks || []).map((track) => ({
    ...track,
    id: track.id || track._id,
    _convexId: track._id,
    // Parse genres and styles from comma-separated strings if needed
    genres: track.genres
      ? typeof track.genres === 'string'
        ? track.genres.split(',').map((g: string) => g.trim())
        : track.genres
      : [],
    styles: track.styles
      ? typeof track.styles === 'string'
        ? track.styles.split(',').map((s: string) => s.trim())
        : track.styles
      : [],
  })) as CrateTrack[];

  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  const handlePlayToggle = async (track: CrateTrack) => {
    if (!track.youtube_video_id || !player || !isReady) {
      const reason = !track.youtube_video_id
        ? 'No video ID available'
        : !player
          ? 'YouTube player not initialized'
          : 'Player not ready';
      console.error('Cannot play track:', reason);
      return;
    }

    try {
      if (playingTrackId === track.position) {
        player.pauseVideo();
        setPlayingTrackId(null);
      } else {
        if (playingTrackId) {
          player.stopVideo();
        }

        player.loadVideoById({
          videoId: track.youtube_video_id,
          suggestedQuality: 'small',
        });

        player.playVideo();
        setPlayingTrackId(track.position);
      }
    } catch (err) {
      console.error('Failed to play track:', err);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-border/10 rounded-base" />
        ))}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center">
        <p>No tracks found for this release</p>
      </div>
    );
  }

  return (
    <TrackList
      tracks={tracks}
      playingTrackId={playingTrackId}
      onPlayToggle={handlePlayToggle}
      isPlayerReady={isReady}
    />
  );
};

export default ReleaseTracks;
