import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/lib/components/ui/card';
import { Play, Pause, Trash2, Globe, Lock } from 'lucide-react';
import { cn } from '@/lib/utils/tailwind';
import { Image } from '@unpic/react';
import { usePlayerStore } from '@/lib/stores';
import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { Button } from '@/lib/components/ui/button';
import { toast } from 'sonner';

interface PlaylistCardProps {
  playlist: any; // Accept Convex playlist format
  handleClick: () => void;
  onExpand: () => void;
}

export const PlaylistCard = ({
  playlist,
  handleClick,
  onExpand,
}: PlaylistCardProps) => {
  const { deletePlaylist, updatePlaylist } = usePlaylists();
  const { playingTrackId, isPlaying, togglePlayPause } = usePlayerStore();

  const playlistId = playlist._id || playlist.id;

  const isPlayingThisPlaylist = playlist.tracks?.some(
    (track: any) => track.id === playingTrackId || track._id === playingTrackId,
  );

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.tracks?.length > 0) {
      togglePlayPause(playlist.tracks[0]);
      onExpand(); // Always expand when playing
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deletePlaylist(playlistId);
      // Toast is handled by the hook
    } catch (error) {
      // Error toast is handled by the hook
      console.error('Failed to delete playlist:', error);
    }
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all hover:shadow-light cursor-pointer border-none',
        isPlayingThisPlaylist && 'ring-2 ring-mainAccent',
      )}
      onClick={handleClick}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="absolute right-4 top-4 flex gap-2">
        <button
          className={cn(
            'p-3 rounded-full bg-mainAccent text-text',
            isPlayingThisPlaylist
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100',
            'transition-all hover:scale-105',
          )}
          onClick={handlePlayPause}
        >
          {isPlayingThisPlaylist && isPlaying ? (
            <Pause size={24} />
          ) : (
            <Play size={24} />
          )}
        </button>

        {!playlist.is_favorites && (
          <Button
            variant="destructive"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <CardHeader className="h-48 bg-gray-100">
        {playlist.tracks?.length > 0 && playlist.tracks[0].artwork ? (
          <Image
            src={decodeURIComponent(
              playlist.tracks[0].artwork.replace(/^"(.*)"$/, '$1'),
            )}
            alt={playlist.tracks[0].artist ?? ''}
            className="w-full h-full object-cover"
            width={400}
            height={400}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <Play size={48} className="text-gray-400" />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 bg-bg space-y-3">
        <CardTitle className="text-lg font-heading font-medium text-text mb-1">
          {playlist?.title}
        </CardTitle>
        <p className="text-small-subtitle text-text/70">
          {playlist?.tracks?.length} tracks
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <label
              htmlFor={`public-${playlistId}`}
              className="text-xs font-medium cursor-pointer flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {playlist.is_public ? (
                <>
                  <Globe className="h-3 w-3" />
                  Public
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" />
                  Private
                </>
              )}
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
