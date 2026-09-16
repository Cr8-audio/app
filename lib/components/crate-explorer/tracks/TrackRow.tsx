import { Play, Pause, MoreHorizontal } from 'lucide-react';
import { Button } from '@/lib/components/ui/button';
import { CrateTrack } from '@/lib/types';
import { cn } from '@/lib/utils/tailwind';
import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { PlaylistActions } from './PlaylistActions';
import { Image } from '@unpic/react';
import { useState } from 'react';

interface TrackRowProps {
  track: CrateTrack;
  index: number;
  isSuggested: boolean;
  isFirstSuggested: boolean;
  isLastSuggested: boolean;
  playingTrackId: string | null;
  isPlayerReady: boolean;
  onPlayToggle: (track: CrateTrack) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onCreateNewPlaylist: (name: string, track: CrateTrack) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
}

export const TrackRow = ({
  track,
  index,
  isSuggested,
  isFirstSuggested,
  isLastSuggested,
  playingTrackId,
  isPlayerReady,
  onPlayToggle,
  onAddToPlaylist,
  onCreateNewPlaylist,
  isPlaying,
  onPlayPause,
}: TrackRowProps) => {
  const { playlists } = usePlaylists();
  const formatArtists = (artist: string, extraArtists: string | null) => {
    if (!extraArtists) return artist;
    return `${artist}, ${extraArtists}`;
  };

  const formatList = (list: string | null) => {
    if (!list) return '-';
    return list.split(',').join(', ');
  };

  const [isHovering, setIsHovering] = useState(false);

  return (
    <tr
      className={cn(
        'hover:bg-accent/5 group relative transition-all duration-300',
        isSuggested && [
          'bg-gradient-to-r from-primary/[0.03] to-primary/[0.07]',
          'border-l-[3px] border-primary/40',
          'shadow-[inset_0_0_40px_rgba(0,0,0,0.02)]',
        ],
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="relative">
          <div className="invisible group-hover:visible">
            <PlaylistActions
              track={track}
              playlists={playlists.map((playlist: any) => ({
                id: playlist._id || playlist.id,
                name: playlist.title || playlist.name,
              }))}
              onAddToPlaylist={onAddToPlaylist}
              onCreateNewPlaylist={onCreateNewPlaylist}
            />
          </div>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <Button
            variant="noShadow"
            size="icon"
            className="w-8 h-8"
            onClick={() => onPlayToggle(track)}
            disabled={!track.youtube_video_id || !isPlayerReady}
          >
            {playingTrackId === track.id ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <span className="ml-2 text-sm text-gray-500">{track.position}</span>
          <div className="invisible group-hover:visible ml-2">
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {track.artwork ? (
            <div className="h-10 w-10 flex-shrink-0 mr-4">
              <Image
                src={track.artwork}
                alt={track.title}
                width={40}
                height={40}
                className="h-10 w-10 rounded-sm object-cover"
              />
            </div>
          ) : (
            <div className="h-10 w-10 flex-shrink-0 mr-4 bg-gray-100 rounded-sm" />
          )}
          <div
            className={cn(
              'text-sm font-medium text-gray-900 max-w-[24rem] overflow-hidden',
              isHovering && 'animate-marquee',
            )}
          >
            {track.title.length > 30
              ? `${track.title.substring(0, 30)}...`
              : track.title}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[18rem] overflow-hidden">
        {formatArtists(track.artist, track.extra_artists).length > 15
          ? `${formatArtists(track.artist, track.extra_artists).substring(0, 15)}...`
          : formatArtists(track.artist, track.extra_artists)}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex items-center">
          {track.genres && <span>{formatList(track.genres)}</span>}
          {track.genres && track.styles && <span className="mx-1">/</span>}
          {track.styles && <span>{formatList(track.styles)}</span>}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        {track.bpm || '-'}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        {track.duration || '-'}
      </td>
      {isFirstSuggested && (
        <div className="absolute -top-px left-0 right-0 h-px bg-primary/10" />
      )}
      {isLastSuggested && (
        <div className="absolute -bottom-px left-0 right-0 h-px bg-primary/10" />
      )}
    </tr>
  );
};
