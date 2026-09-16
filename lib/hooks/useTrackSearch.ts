import { useState, useMemo } from 'react';
import type { CrateTrack } from '@/lib/types';

export default function useTrackSearch(tracks: CrateTrack[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredTracks = useMemo(() => {
    if (!searchQuery) return tracks;
    return tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.genres?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.styles?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [tracks, searchQuery]);
  return {
    searchQuery,
    setSearchQuery,
    filteredTracks,
  };
}
