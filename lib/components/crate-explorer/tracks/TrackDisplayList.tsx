import { useState } from 'react';
import { Button } from '@/lib/components/ui/button';
import {
  Play,
  Pause,
  Heart,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Plus,
  ListPlus,
  Loader2,
} from 'lucide-react';
import ReleaseTracks from './ReleaseTracks';
import { useTrackContext } from './TrackDisplay';
import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { convertSearchResultToTrack } from '@/lib/utils/track-conversion';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/lib/components/ui/dropdown-menu';
import { toast } from 'sonner';

const TrackDisplayList = () => {
  const {
    result: trackResult,
    isPlaying: trackIsPlaying,
    isLoading: trackIsLoading,
    onPlayToggle: trackOnPlayToggle,
    dateAdded,
  } = useTrackContext();
  const [showTracks, setShowTracks] = useState(false);
  const { playlists, addTrackToPlaylist } = usePlaylists();

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!trackResult) return;

    try {
      const track = convertSearchResultToTrack(trackResult) as any;
      // Note: External tracks need to be added to the database first
      // For now, we'll show a message
      if (track._id) {
        await addTrackToPlaylist(playlistId, track._id);
      } else {
        toast.info('External tracks cannot be added to playlists yet');
      }
    } catch (error) {
      console.error('Error adding to playlist:', error);
    }
  };

  if (!trackResult) return null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 p-3 border-2 border-border dark:border-darkBorder rounded-base group items-center">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={trackResult.thumb || '/api/placeholder/50/50'}
              alt={trackResult.title}
              className="w-12 h-12 rounded-base object-cover"
            />
            <button
              onClick={trackOnPlayToggle}
              disabled={trackIsLoading}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-base disabled:opacity-100"
            >
              {trackIsLoading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : trackIsPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
          <div>
            <div className="font-medium text-text dark:text-darkText">
              {trackResult.title}
            </div>
            <div className="text-sm text-text/60 dark:text-darkText/60">
              {trackResult.year} · {trackResult.country || 'Unknown'}
            </div>
          </div>
        </div>

        <div className="text-sm text-text/60 dark:text-darkText/60">
          <div>{trackResult.genre?.join(', ') || 'No Genre'}</div>
          <div>{trackResult.style?.join(', ') || 'No Style'}</div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="noShadow"
            size="icon"
            onClick={() => setShowTracks(!showTracks)}
          >
            {showTracks ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          {/* Add to Playlist Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="noShadow" size="icon" title="Add to Playlist">
                <ListPlus className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {playlists && playlists.length > 0 ? (
                playlists.map((playlist) => (
                  <DropdownMenuItem
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {playlist.title}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No playlists found</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="noShadow" size="icon">
            <Heart className="w-4 h-4" />
          </Button>
          <Button variant="noShadow" size="icon">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showTracks && (
        <div className="ml-16">
          <ReleaseTracks releaseId={trackResult.id} />
        </div>
      )}
    </div>
  );
};

export default TrackDisplayList;
