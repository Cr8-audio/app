'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/lib/components/ui/button';
import { Input } from '@/lib/components/ui/input';
import { Label } from '@/lib/components/ui/label';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/lib/components/ui/dialog';
import { Card, CardContent } from '@/lib/components/ui/card';
import { Music, Plus, Check } from 'lucide-react';
import { CrateTrack } from '@/lib/types';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

interface PlaylistCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedTracks: CrateTrack[];
  onPlaylistCreated?: (playlistId: Id<'playlists'>) => void;
}

export default function PlaylistCreationModal({
  isOpen,
  onClose,
  suggestedTracks,
  onPlaylistCreated,
}: PlaylistCreationModalProps) {
  const [playlistName, setPlaylistName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(
    new Set(suggestedTracks.map((track) => track.id)),
  );
  const [isCreating, setIsCreating] = useState(false);

  const createPlaylistWithTracks = useMutation(
    api.playlists.createPlaylistWithTracks,
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedTracks(new Set(suggestedTracks.map((track) => track.id)));
    }
  }, [isOpen, suggestedTracks]);

  const toggleTrackSelection = (trackId: string) => {
    const newSelection = new Set(selectedTracks);
    if (newSelection.has(trackId)) {
      newSelection.delete(trackId);
    } else {
      newSelection.add(trackId);
    }
    setSelectedTracks(newSelection);
  };

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    if (selectedTracks.size === 0) {
      toast.error('Please select at least one track');
      return;
    }

    setIsCreating(true);

    try {
      // Keep the suggestion order; tracks come from Convex, so each has an _id.
      const trackIds = suggestedTracks
        .filter((track) => selectedTracks.has(track.id))
        .map((track) => (track as CrateTrack & { _id: Id<'tracks'> })._id)
        .filter(Boolean);

      const { playlistId, trackCount } = await createPlaylistWithTracks({
        title: playlistName,
        description:
          description || `AI-generated playlist with ${trackIds.length} tracks`,
        trackIds,
      });

      toast.success(
        `Created playlist "${playlistName.trim()}" with ${trackCount} ${
          trackCount === 1 ? 'track' : 'tracks'
        }`,
      );
      onPlaylistCreated?.(playlistId);
      onClose();

      // Reset form
      setPlaylistName('');
      setDescription('');
      setSelectedTracks(new Set(suggestedTracks.map((track) => track.id)));
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Failed to create playlist. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <p className="eyebrow">Save the find</p>
          <DialogTitle className="text-xl text-foreground">
            Turn these tracks into a playlist
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Name the idea now. You can keep shaping the order later.
          </p>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Playlist Info */}
          <div className="space-y-3">
            <div>
              <Label
                htmlFor="playlist-name"
                className="text-foreground font-medium"
              >
                Playlist name
              </Label>
              <Input
                id="playlist-name"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Late room, early morning…"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label
                htmlFor="playlist-description"
                className="text-foreground font-medium"
              >
                Note{' '}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <textarea
                id="playlist-description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(e.target.value)
                }
                placeholder="What is this set for?"
                className="mt-1.5 flex min-h-[72px] w-full resize-none rounded-[0.75rem] border border-input bg-popover px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/15"
                rows={2}
              />
            </div>
          </div>

          {/* Track Selection */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-foreground font-medium">
                Select Tracks ({selectedTracks.size}/{suggestedTracks.length})
              </Label>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedTracks(new Set(suggestedTracks.map((t) => t.id)))
                  }
                  className="text-[0.68rem]"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTracks(new Set())}
                  className="text-[0.68rem]"
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto rounded-[1rem] border border-border/70 bg-muted/35 p-2">
              {suggestedTracks.map((track) => {
                const isSelected = selectedTracks.has(track.id);
                return (
                  <Card
                    key={track.id}
                    className={`cursor-pointer rounded-[0.85rem] border shadow-none transition-colors ${
                      isSelected
                        ? 'border-primary/25 bg-accent'
                        : 'border-transparent bg-card hover:border-border'
                    }`}
                    onClick={() => toggleTrackSelection(track.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleTrackSelection(track.id);
                      }
                    }}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-[0.7rem] ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Music className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate text-foreground ">
                            {track.title}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {track.artist}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            {track.bpm && (
                              <span className="rounded-full bg-card px-2 py-0.5 font-mono text-[0.62rem] text-muted-foreground">
                                {track.bpm} BPM
                              </span>
                            )}
                            {track.genres && (
                              <span className="rounded-full bg-card px-2 py-0.5 text-[0.62rem] text-muted-foreground">
                                {track.genres.split(',')[0]?.trim()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreatePlaylist} disabled={isCreating}>
            {isCreating ? (
              <>
                <Plus className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Playlist
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
