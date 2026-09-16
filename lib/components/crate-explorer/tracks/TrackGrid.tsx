import { DiscogsSearchResult } from '@/lib/types';
import TrackDisplay from './TrackDisplay';
import { usePlayerStore } from '@/lib/stores';
import {
  convertSearchResultToTrack,
  createTemporaryTrackForPlayback,
} from '@/lib/utils/track-conversion';
import { toast } from 'sonner';
import { useState } from 'react';

interface TrackGridProps {
  viewMode: 'grid' | 'list';
  items: DiscogsSearchResult[];
}

const TrackGrid = ({ viewMode, items }: TrackGridProps) => {
  const { playingTrackId, isPlaying, togglePlayPause, isReady, setQueue } =
    usePlayerStore();
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  const searchYouTubeForTrack = async (
    result: DiscogsSearchResult,
  ): Promise<string | null> => {
    try {
      // Extract artist and title from the Discogs result
      const titleParts = result.title.split(' - ');
      const artist = titleParts.length > 1 ? titleParts[0] : '';
      const title =
        titleParts.length > 1 ? titleParts.slice(1).join(' - ') : result.title;

      const searchQuery = `${artist} ${title}`.trim();

      const response = await fetch(
        `/api/external/youtube/search?q=${encodeURIComponent(searchQuery)}`,
      );

      if (!response.ok) {
        throw new Error('YouTube search failed');
      }

      const data = await response.json();
      return data.videoId || null;
    } catch (error) {
      console.error('YouTube search error:', error);
      return null;
    }
  };

  const handlePlayToggle = async (result: DiscogsSearchResult) => {
    if (!isReady) {
      toast.error('Player is still loading...');
      return;
    }

    try {
      const tempTrack = createTemporaryTrackForPlayback(result);
      setLoadingTrackId(tempTrack.id);

      // If the track doesn't have a YouTube video ID, search for one
      if (!tempTrack.youtube_video_id) {
        toast.loading('Finding audio for this track...', {
          id: 'youtube-search',
        });

        const videoId = await searchYouTubeForTrack(result);

        if (!videoId) {
          toast.error('No audio found for this track', {
            id: 'youtube-search',
          });
          setLoadingTrackId(null);
          return;
        }

        // Update the track with the found video ID
        tempTrack.youtube_video_id = videoId;
        toast.success('Audio found! Starting playback...', {
          id: 'youtube-search',
        });
      }

      // Convert all search results to tracks for queue (some may need YouTube lookup later)
      const searchTracks = items.map((item) =>
        createTemporaryTrackForPlayback(item),
      );
      const trackIndex = searchTracks.findIndex(
        (track) => track.id === tempTrack.id,
      );

      // Update the track in the queue with the video ID
      if (trackIndex !== -1) {
        searchTracks[trackIndex] = tempTrack;
      }

      setQueue(searchTracks, trackIndex);
      togglePlayPause(tempTrack);
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
          ? 'space-y-2'
          : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
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
            onPlayToggle={() => handlePlayToggle(item)}
            dateAdded={item.date_added || ''}
          />
        );
      })}
    </div>
  );
};

export default TrackGrid;
