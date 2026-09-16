import { CrateTrack } from '@/types';
import { Playlist as DbPlaylist } from '@/types';

export interface PlaylistWithTracks extends DbPlaylist {
  tracks: CrateTrack[];
  isPlaying?: boolean;
}

export interface PlaylistCardProps {
  playlist: PlaylistWithTracks;
  isPlaying?: boolean;
  onClick?: () => void;
}
