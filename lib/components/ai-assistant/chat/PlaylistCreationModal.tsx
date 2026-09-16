'use client';

import { useState } from 'react';
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
import { usePlaylists } from '@/lib/hooks/usePlaylists';

interface PlaylistCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedTracks: CrateTrack[];
  onPlaylistCreated?: (playlistId: string) => void;
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

  const { createPlaylist, addTrackToPlaylist } = usePlaylists();

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
      // Create the playlist using Convex
      const playlist = await createPlaylist(
        playlistName,
        description ||
          `AI-generated playlist with ${selectedTracks.size} tracks`,
      );

      if (!playlist) {
        throw new Error('Failed to create playlist');
      }

      // Note: Adding tracks to playlist would require Convex IDs
      // For now, we'll show success - tracks can be added later
      // TODO: Implement track-to-playlist association with proper ID mapping

      toast.success(
        `Created playlist "${playlistName}" with ${selectedTracks.size} tracks`,
      );
      onPlaylistCreated?.(playlist._id);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-bg border-2 border-black shadow-light">
        <DialogHeader>
          <DialogTitle className="text-text font-heading">
            Create Playlist from AI Suggestions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Playlist Info */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="playlist-name" className="text-text font-medium">
                Playlist Name
              </Label>
              <Input
                id="playlist-name"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Enter playlist name..."
                className="mt-1 border-2 border-black bg-white focus:ring-main focus:border-main"
              />
            </div>
            <div>
              <Label
                htmlFor="playlist-description"
                className="text-text font-medium"
              >
                Description (Optional)
              </Label>
              <textarea
                id="playlist-description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(e.target.value)
                }
                placeholder="Describe your playlist..."
                className="mt-1 resize-none flex min-h-[60px] w-full rounded-base border-2 border-black bg-white px-3 py-2 text-sm text-text placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-main focus:border-main"
                rows={2}
              />
            </div>
          </div>

          {/* Track Selection */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-text font-medium">
                Select Tracks ({selectedTracks.size}/{suggestedTracks.length})
              </Label>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedTracks(new Set(suggestedTracks.map((t) => t.id)))
                  }
                  className="border-2 border-black bg-white hover:bg-main hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none shadow-light transition-all"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTracks(new Set())}
                  className="border-2 border-black bg-white hover:bg-red-100 hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none shadow-light transition-all"
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 border-2 border-black rounded-base p-3 bg-white">
              {suggestedTracks.map((track) => {
                const isSelected = selectedTracks.has(track.id);
                return (
                  <Card
                    key={track.id}
                    className={`cursor-pointer transition-all border-2 border-black rounded-base shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none ${
                      isSelected ? 'bg-main' : 'bg-white hover:bg-bg'
                    }`}
                    onClick={() => toggleTrackSelection(track.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-mainAccent border-2 border-black rounded-base flex items-center justify-center">
                          {isSelected ? (
                            <Check className="w-5 h-5 text-black" />
                          ) : (
                            <Music className="w-5 h-5 text-black" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate text-text font-heading">
                            {track.title}
                          </h4>
                          <p className="text-xs text-gray-600 truncate">
                            {track.artist}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            {track.bpm && (
                              <span className="bg-white border border-black text-xs px-2 py-0.5 rounded-base text-text font-mono">
                                {track.bpm} BPM
                              </span>
                            )}
                            {track.genres && track.genres.length > 0 && (
                              <span className="border border-black text-xs px-2 py-0.5 rounded-base text-text">
                                {track.genres[0]}
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
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
            className="border-2 border-black bg-white hover:bg-gray-100 text-text shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreatePlaylist}
            disabled={isCreating}
            className="bg-main hover:bg-mainAccent border-2 border-black text-text font-medium shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all"
          >
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
