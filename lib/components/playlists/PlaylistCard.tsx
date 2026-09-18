import type { MouseEvent } from 'react';
import {
  ChevronRight,
  Globe,
  ListMusic,
  Lock,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { usePlayerStore } from '@/lib/stores';
import type { CrateTrack } from '@/lib/types';
import { cn } from '@/lib/utils/tailwind';

type PlaylistCardTrack = CrateTrack & { _id?: string };

interface PlaylistCardData {
  _id?: Id<'playlists'>;
  id?: string;
  title: string;
  is_public?: boolean | null;
  is_favorites?: boolean | null;
  tracks?: PlaylistCardTrack[];
}

interface PlaylistCardProps {
  playlist: PlaylistCardData;
  handleClick: () => void;
  onExpand: () => void;
  isExpanded?: boolean;
}

function normalizeArtwork(value?: string | null) {
  if (!value) return null;
  return decodeURIComponent(value.replace(/^"(.*)"$/, '$1'));
}

export const PlaylistCard = ({
  playlist,
  handleClick,
  onExpand,
  isExpanded = false,
}: PlaylistCardProps) => {
  const { deletePlaylist } = usePlaylists();
  const { playingTrackId, isPlaying, togglePlayPause, setQueue } =
    usePlayerStore();

  const tracks = playlist.tracks ?? [];
  const artworks = tracks
    .map((track) => normalizeArtwork(track.artwork))
    .filter(Boolean)
    .slice(0, 4) as string[];
  const isPlayingThisPlaylist = tracks.some(
    (track) => track.id === playingTrackId || track._id === playingTrackId,
  );

  const handlePlayPause = async (event: MouseEvent) => {
    event.stopPropagation();
    if (tracks.length > 0) {
      const activeIndex = tracks.findIndex(
        (track) => track.id === playingTrackId || track._id === playingTrackId,
      );
      const startIndex = activeIndex >= 0 ? activeIndex : 0;
      const targetTrack = tracks[startIndex];
      setQueue(tracks, startIndex);
      const didStart = await togglePlayPause(targetTrack);
      if (!didStart) toast.error('No playable audio found for this playlist');
      onExpand();
    }
  };

  const handleDelete = async (event: MouseEvent) => {
    event.stopPropagation();
    if (!playlist._id) return;

    const confirmed = window.confirm(
      `Delete “${playlist.title}”? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deletePlaylist(playlist._id);
    } catch (error) {
      console.error('Failed to delete playlist:', error);
    }
  };

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-2xl border bg-card transition-colors',
        isExpanded
          ? 'border-primary/50'
          : 'border-border/70 hover:border-border',
      )}
      onClick={handleClick}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {artworks.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-background">
            <ListMusic className="h-12 w-12 text-muted-foreground/60" />
          </div>
        ) : artworks.length === 1 ? (
          <img
            src={artworks[0]}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-border">
            {Array.from({ length: 4 }).map((_, index) =>
              artworks[index] ? (
                <img
                  key={artworks[index]}
                  src={artworks[index]}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div key={index} className="bg-muted" />
              ),
            )}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {!playlist.is_favorites && (
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black backdrop-blur-sm transition-colors hover:bg-white"
              onClick={handleDelete}
              aria-label={`Delete ${playlist.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-sm transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(event) => void handlePlayPause(event)}
          disabled={tracks.length === 0}
          aria-label={
            isPlayingThisPlaylist && isPlaying
              ? 'Pause playlist'
              : 'Play playlist'
          }
        >
          {isPlayingThisPlaylist && isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" />
          )}
        </button>
      </div>

      <button
        type="button"
        className="w-full p-4 text-left"
        onClick={(event) => {
          event.stopPropagation();
          handleClick();
        }}
        aria-expanded={isExpanded}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">
              {playlist.title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
            </p>
          </div>
          <ChevronRight
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              isExpanded && 'rotate-90 text-primary',
            )}
          />
        </div>
        <div className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          {playlist.is_public ? (
            <Globe className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          )}
          {playlist.is_public ? 'Public' : 'Private'}
        </div>
      </button>
    </article>
  );
};
