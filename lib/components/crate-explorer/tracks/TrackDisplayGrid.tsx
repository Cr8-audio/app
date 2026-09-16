import { useState } from 'react';
import { Button } from '@/lib/components/ui/button';
import {
  Play,
  Pause,
  Heart,
  MoreHorizontal,
  ChevronDown,
  ListMusic,
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

const TrackDisplayGrid = () => {
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
    <div className="relative border-2 border-border dark:border-darkBorder rounded-base p-3">
      {showTracks && (
        <div className="absolute inset-0 z-10 bg-background/95 dark:bg-darkBg/95 backdrop-blur-sm rounded-base overflow-y-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-text dark:text-darkText">
                {trackResult.title}
              </h3>
              <Button
                variant="noShadow"
                size="icon"
                onClick={() => setShowTracks(false)}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            <ReleaseTracks releaseId={trackResult.id} />
          </div>
        </div>
      )}

      <div className="relative group mb-3">
        <img
          src={trackResult.cover_image || '/api/placeholder/300/300'}
          alt={trackResult.title}
          className="w-full aspect-square object-cover rounded-base"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-base">
          <div className="flex gap-2">
            <button
              onClick={trackOnPlayToggle}
              disabled={trackIsLoading}
              className="p-2 rounded-full bg-background/20 hover:bg-background/40 transition-colors disabled:opacity-80"
            >
              {trackIsLoading ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : trackIsPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white" />
              )}
            </button>
            <button
              onClick={() => setShowTracks(true)}
              className="p-2 rounded-full bg-background/20 hover:bg-background/40 transition-colors"
            >
              <ListMusic className="w-8 h-8 text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-text dark:text-darkText mb-1">
            {trackResult.title}
          </h3>
          <div className="text-sm text-text/60 dark:text-darkText/60 mb-2">
            {trackResult.year} · {trackResult.country || 'Unknown'}
          </div>
          <div className="text-sm text-text/60 dark:text-darkText/60">
            {trackResult.genre?.join(', ') || 'No Genre'}
          </div>
        </div>
        <div className="flex gap-2">
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
    </div>
  );
};

export default TrackDisplayGrid;
