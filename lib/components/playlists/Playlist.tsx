'use client';

import { useEffect, useState } from 'react';
import { Image } from '@unpic/react';
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  ListMusic,
  Lock,
  Pause,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/lib/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog';
import { Input } from '@/lib/components/ui/input';
import { Switch } from '@/lib/components/ui/switch';
import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { usePlayerStore } from '@/lib/stores';
import type { CrateTrack } from '@/lib/types';
import { formatDuration } from '@/lib/utils/format';
import { cn } from '@/lib/utils/tailwind';

interface PlaylistProps {
  activePlaylistId: string;
}

type PlaylistTrack = CrateTrack & { _id: Id<'tracks'> };

export const Playlist = ({ activePlaylistId }: PlaylistProps) => {
  const {
    playlists,
    removeTrackFromPlaylist,
    updatePlaylist,
    reorderPlaylistTracks,
  } = usePlaylists();
  const {
    initializePlayer,
    playingTrackId,
    isPlaying,
    togglePlayPause,
    setQueue,
  } = usePlayerStore();
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const activePlaylist = playlists.find(
    (playlist) =>
      playlist._id === activePlaylistId || playlist.id === activePlaylistId,
  );

  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  if (!activePlaylist) return null;

  const playlistId = activePlaylist._id || activePlaylist.id;
  const tracks = (activePlaylist.tracks ?? []) as PlaylistTrack[];
  const sharePath = activePlaylist.id ? `/p/${activePlaylist.id}` : null;

  const handlePlayTrack = async (track: PlaylistTrack, index: number) => {
    setQueue(tracks, index);
    const didStart = await togglePlayPause(track);
    if (!didStart) toast.error('No playable audio found for this track');
  };

  const handleRemoveTrack = async (trackId: Id<'tracks'>) => {
    if (!playlistId) return;
    try {
      await removeTrackFromPlaylist(playlistId, trackId);
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

  const openEditor = () => {
    setEditTitle(activePlaylist.title);
    setEditDescription(activePlaylist.description ?? '');
    setEditOpen(true);
  };

  const saveDetails = async () => {
    if (!playlistId || !editTitle.trim() || isSavingDetails) return;
    setIsSavingDetails(true);
    try {
      await updatePlaylist(playlistId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      setEditOpen(false);
    } finally {
      setIsSavingDetails(false);
    }
  };

  const copyShareLink = async () => {
    if (!sharePath) return;
    await navigator.clipboard.writeText(
      `${window.location.origin}${sharePath}`,
    );
    toast.success('Public playlist link copied');
  };

  const moveTrack = async (index: number, direction: -1 | 1) => {
    if (!activePlaylist._id) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= tracks.length) return;

    const reordered = [...tracks];
    [reordered[index], reordered[nextIndex]] = [
      reordered[nextIndex],
      reordered[index],
    ];
    await reorderPlaylistTracks(
      activePlaylist._id,
      reordered.map((track) => track._id),
    );
  };

  return (
    <section aria-labelledby={`playlist-${playlistId}`}>
      <div className="flex flex-col gap-5 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Selected playlist
          </p>
          <h2
            id={`playlist-${playlistId}`}
            className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            {activePlaylist.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
          </p>
          {activePlaylist.description && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {activePlaylist.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 rounded-full px-4"
            onClick={openEditor}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit details
          </Button>

          {activePlaylist.is_public && sharePath && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-full px-4"
                onClick={() => void copyShareLink()}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy link
              </Button>
              <a
                href={sharePath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Open
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </a>
            </>
          )}

          <div className="flex min-h-10 items-center gap-3 rounded-full border border-border/70 bg-background px-3">
            <Switch
              id={`public-${playlistId}`}
              checked={activePlaylist.is_public ?? false}
              onCheckedChange={handleTogglePublic}
            />
            <label
              htmlFor={`public-${playlistId}`}
              className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
            >
              {activePlaylist.is_public ? (
                <Globe className="h-4 w-4 text-primary" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              {activePlaylist.is_public ? 'Public' : 'Private'}
            </label>
          </div>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="py-14 text-center">
          <ListMusic className="mx-auto h-7 w-7 text-muted-foreground" />
          <h3 className="mt-4 font-medium text-foreground">
            This playlist is waiting for a first track
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the playlist action from Your tracks to add one.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 space-y-2 md:hidden">
            {tracks.map((track, index) => {
              const trackId = track._id;
              const isPlayingThisTrack =
                playingTrackId === trackId || playingTrackId === track.id;
              return (
                <div
                  key={trackId}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-2.5',
                    isPlayingThisTrack
                      ? 'border-primary/40 bg-primary/[0.035]'
                      : 'border-border/70 bg-background',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void handlePlayTrack(track, index)}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted"
                    aria-label={
                      isPlayingThisTrack && isPlaying
                        ? `Pause ${track.title}`
                        : `Play ${track.title}`
                    }
                  >
                    {track.artwork && (
                      <Image
                        src={track.artwork}
                        alt=""
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                      {isPlayingThisTrack && isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {track.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {track.artist || 'Unknown artist'}
                    </p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatDuration(track.duration)}
                  </span>
                  <div className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => void moveTrack(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${track.title} up`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => void moveTrack(index, 1)}
                      disabled={index === tracks.length - 1}
                      aria-label={`Move ${track.title} down`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => handleRemoveTrack(trackId)}
                      aria-label={`Remove ${track.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 hidden overflow-hidden rounded-2xl border border-border/70 md:block">
            <table className="min-w-full">
              <thead className="border-b border-border/70 bg-muted/40">
                <tr>
                  <th className="w-16 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Play
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Track
                  </th>
                  <th className="w-28 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Time
                    </span>
                  </th>
                  <th className="w-36 px-4 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-background">
                {tracks.map((track, index) => {
                  const trackId = track._id;
                  const isPlayingThisTrack =
                    playingTrackId === trackId || playingTrackId === track.id;
                  return (
                    <tr
                      key={trackId}
                      className={cn(
                        'transition-colors hover:bg-muted/40',
                        isPlayingThisTrack && 'bg-primary/[0.035]',
                      )}
                    >
                      <td className="px-4 py-3">
                        <Button
                          variant={isPlayingThisTrack ? 'default' : 'ghost'}
                          size="icon"
                          className="h-9 w-9 rounded-full"
                          onClick={() => void handlePlayTrack(track, index)}
                          aria-label={
                            isPlayingThisTrack && isPlaying
                              ? `Pause ${track.title}`
                              : `Play ${track.title}`
                          }
                        >
                          {isPlayingThisTrack && isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {track.artwork && (
                              <Image
                                src={track.artwork}
                                alt=""
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {track.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {track.artist || 'Unknown artist'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
                        {formatDuration(track.duration)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() => void moveTrack(index, -1)}
                            disabled={index === 0}
                            aria-label={`Move ${track.title} up`}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() => void moveTrack(index, 1)}
                            disabled={index === tracks.length - 1}
                            aria-label={`Move ${track.title} down`}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() => handleRemoveTrack(trackId)}
                            aria-label={`Remove ${track.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl tracking-tight">
              Playlist details
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveDetails();
            }}
          >
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Title
              </span>
              <Input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                maxLength={80}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Listener note
              </span>
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={4}
                maxLength={280}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!editTitle.trim() || isSavingDetails}
              >
                {isSavingDetails ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};
