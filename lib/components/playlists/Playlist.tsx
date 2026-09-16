'use client';

import { useEffect } from 'react';
import { Play, Pause, Trash2, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/tailwind';
import { usePlayerStore } from '@/lib/stores';
import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { formatDuration } from '@/lib/utils/format';
import { Button } from '@/lib/components/ui/button';
import { Switch } from '@/lib/components/ui/switch';

interface PlaylistProps {
  activePlaylistId: string;
}

export const Playlist = ({ activePlaylistId }: PlaylistProps) => {
  const { playlists, removeTrackFromPlaylist, updatePlaylist } = usePlaylists();
  const { initializePlayer, playingTrackId, isPlaying, togglePlayPause } =
    usePlayerStore();

  // Find playlist by either Convex _id or old id
  const activePlaylist = playlists.find(
    (p: any) => p._id === activePlaylistId || p.id === activePlaylistId,
  );

  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  if (!activePlaylist) {
    return null;
  }

  const playlistId = activePlaylist?._id || activePlaylist?.id;

  const handleRemoveTrack = async (trackId: string) => {
    if (!playlistId) return;
    try {
      await removeTrackFromPlaylist(playlistId, trackId as any);
      toast.success('Track removed from playlist');
    } catch (error) {
      console.error('Error removing track:', error);
      toast.error('Failed to remove track');
    }
  };

  const handleTogglePublic = async (checked: boolean) => {
    if (!playlistId) return;
    try {
      await updatePlaylist(playlistId, { is_public: checked });
    } catch (error) {
      console.error('Error updating playlist visibility:', error);
    }
  };

  return (
    <div className="relative overflow-x-auto">
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-medium-title font-heading font-bold text-text">
            {activePlaylist.title}
          </h2>
        </div>

        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <Switch
            id={`public-${playlistId}`}
            checked={activePlaylist.is_public ?? false}
            onCheckedChange={handleTogglePublic}
          />
          <label
            htmlFor={`public-${playlistId}`}
            className="text-sm font-medium cursor-pointer flex items-center gap-2"
          >
            {activePlaylist.is_public ? (
              <>
                <Globe className="h-4 w-4" />
                Public Playlist
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Private Playlist
              </>
            )}
          </label>
        </div>
      </div>

      <table className="min-w-full divide-y divide-border">
        <thead className="bg-bg">
          <tr>
            <th className="w-16 px-4 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
              Play
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
              Track
            </th>
            <th className="w-24 px-4 py-3 text-right text-xs font-medium text-text/70 uppercase tracking-wider">
              Duration
            </th>
            <th className="w-16 px-4 py-3 text-right text-xs font-medium text-text/70 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-bg divide-y divide-border">
          {activePlaylist.tracks?.map((track: any) => {
            const trackId = track._id || track.id;
            const isPlayingThisTrack =
              playingTrackId === trackId || playingTrackId === track.id;
            return (
              <tr key={trackId} className="hover:bg-bg/50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    onClick={() => togglePlayPause(track)}
                    className="p-2 rounded-full hover:bg-bg/50"
                  >
                    {isPlayingThisTrack && isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-text">
                      {track.title}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-text/70">
                  {formatDuration(track.duration)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTrack(trackId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
