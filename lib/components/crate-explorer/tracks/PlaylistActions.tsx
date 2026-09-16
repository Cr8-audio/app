import { ListPlus, Plus } from 'lucide-react';
import { Button } from '@/lib/components/ui/button';
import { CrateTrack } from '@/lib/types';
import { toast } from 'sonner';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/lib/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/lib/components/ui/dialog';
import { Input } from '@/lib/components/ui/input';
import { useState } from 'react';

interface PlaylistActionsProps {
  track: CrateTrack;
  playlists: Array<{ id: string; name: string }>;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onCreateNewPlaylist: (name: string, track: CrateTrack) => void;
}

export function PlaylistActions({
  track,
  playlists,
  onAddToPlaylist,
  onCreateNewPlaylist,
}: PlaylistActionsProps) {
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const user = useQuery(api.users.getCurrentUser);

  const handleCreateNewPlaylist = async () => {
    if (!newPlaylistName.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onCreateNewPlaylist(newPlaylistName, track);
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
      toast.success('Playlist created successfully');
    } catch (error) {
      toast.error('Failed to create playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToPlaylist = (playlistId: string) => {
    if (!user) {
      toast.error('Please sign in to add tracks to playlists');
      return;
    }

    onAddToPlaylist(playlistId, track.id);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <ListPlus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="bg-background/60 backdrop-blur-lg border border-border/50"
        >
          {playlists.map((playlist) => (
            <DropdownMenuItem
              key={playlist.id}
              onClick={() => handleAddToPlaylist(playlist.id)}
              className="hover:bg-accent/50"
            >
              {playlist.name}
            </DropdownMenuItem>
          ))}
          {playlists.length > 0 && (
            <DropdownMenuSeparator className="bg-border/50" />
          )}
          <DropdownMenuItem
            onClick={() => setIsCreatingPlaylist(true)}
            className="hover:bg-accent/50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Playlist
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreatingPlaylist} onOpenChange={setIsCreatingPlaylist}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPlaylistName.trim() && !isLoading)
                  handleCreateNewPlaylist();
                if (e.key === 'Escape') setIsCreatingPlaylist(false);
              }}
              disabled={isLoading}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreatingPlaylist(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewPlaylist}
              disabled={!newPlaylistName.trim() || isLoading}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
