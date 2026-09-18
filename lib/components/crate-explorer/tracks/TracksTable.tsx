'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Image } from '@unpic/react';
import {
  ArrowRight,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  ListPlus,
  Pause,
  Play,
  Plus,
  PlusCircle,
  Rows3,
} from 'lucide-react';
import {
  createColumnHelper,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import { Button } from '@/lib/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog';
import { Input } from '@/lib/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/lib/components/ui/select';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { usePlayerStore } from '@/lib/stores';
import { CrateTrack } from '@/lib/types';
import { cn } from '@/lib/utils/tailwind';
import { SearchInput } from './SearchInput';

const columnHelper = createColumnHelper<CrateTrack>();

function formatArtists(artist: string, extraArtists: string | null) {
  return extraArtists ? `${artist}, ${extraArtists}` : artist;
}

function formatGenres(genres: string | null, styles: string | null) {
  const values = [genres, styles]
    .filter(Boolean)
    .map((value) => value?.split(',').join(', '));
  return values.join(' · ') || '—';
}

export default function TracksTable() {
  const { username } = useParams({ strict: false });
  const convexTracks = useQuery(api.tracks.getUserTracks);
  const allTracks = useMemo(() => {
    if (!convexTracks) return [];
    return convexTracks.map((track) => ({
      ...track,
      id: track.id || track._id,
    })) as CrateTrack[];
  }, [convexTracks]);

  const {
    playlists: convexPlaylists,
    createPlaylist,
    addTrackToPlaylist,
    isLoading: playlistsLoading,
  } = usePlaylists();
  const {
    playingTrackId,
    isReady,
    isPlaying,
    togglePlayPause,
    initializePlayer,
    addToQueue,
  } = usePlayerStore();
  const { isFavorite: checkIsFavorite, toggleFavorite } = useFavorites();

  const [searchQuery, setSearchQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<CrateTrack | null>(null);
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [showPlaylistOptions, setShowPlaylistOptions] = useState<string | null>(
    null,
  );
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<string | null>(
    null,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  const handlePlayToggle = (track: CrateTrack) => {
    if (!track.youtube_video_id) {
      toast.error('No audio available for this track');
      return;
    }

    if (!isReady) {
      toast.error('Player is still loading…');
      return;
    }

    try {
      const { queue, setQueue } = usePlayerStore.getState();
      if (queue.length === 0) {
        const trackIndex = allTracks.findIndex((item) => item.id === track.id);
        setQueue(allTracks, trackIndex);
      }
      togglePlayPause(track);
    } catch (error) {
      console.error('Error playing track:', error);
      toast.error('Failed to play track');
    }
  };

  const handleAddToQueue = (track: CrateTrack) => {
    addToQueue(track);
    toast.success(`Added “${track.title}” to queue`);
  };

  const handleToggleFavorite = async (track: CrateTrack) => {
    setIsTogglingFavorite(track.id);
    try {
      const wasFavorite = checkIsFavorite(track.id);
      await toggleFavorite(track.id);
      toast.success(
        wasFavorite ? 'Removed from favorites' : 'Added to favorites',
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setIsTogglingFavorite(null);
    }
  };

  const openPlaylistOptions = (track: CrateTrack) => {
    setSelectedTrack(track);
    setShowPlaylistOptions(track.id);
  };

  const handleAddToPlaylist = async (playlistId: string, track: CrateTrack) => {
    try {
      const trackId = (track as CrateTrack & { _id?: string })._id ?? track.id;
      await addTrackToPlaylist(playlistId, trackId);
      setShowPlaylistOptions(null);
    } catch (error) {
      console.error('Failed to add to playlist:', error);
    }
  };

  const handleCreateNewPlaylist = async () => {
    if (!newPlaylistName.trim() || isSavingPlaylist || !selectedTrack) return;

    setIsSavingPlaylist(true);
    try {
      const playlistId = await createPlaylist(newPlaylistName.trim());
      if (playlistId) {
        const trackId =
          (selectedTrack as CrateTrack & { _id?: string })._id ??
          selectedTrack.id;
        await addTrackToPlaylist(playlistId, trackId);
      }
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
      setSelectedTrack(null);
    } catch (error) {
      console.error('Failed to create playlist:', error);
    } finally {
      setIsSavingPlaylist(false);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'favorite',
        header: '',
        cell: ({ row }) => {
          const track = row.original;
          const isFavorite = checkIsFavorite(track.id);
          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => handleToggleFavorite(track)}
              disabled={isTogglingFavorite === track.id}
              aria-label={
                isFavorite ? 'Remove from favorites' : 'Add to favorites'
              }
            >
              <Heart
                className={cn(
                  'h-4 w-4 transition-colors',
                  isFavorite
                    ? 'fill-primary text-primary'
                    : 'text-muted-foreground',
                )}
              />
            </Button>
          );
        },
      }),
      columnHelper.accessor((row) => row.title, {
        id: 'title',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            onClick={() => column.toggleSorting()}
          >
            Track
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: ({ row }) => {
          const track = row.original;
          const isCurrent = playingTrackId === track.id;
          return (
            <div className="flex min-w-[17rem] items-center gap-3">
              <button
                type="button"
                onClick={() => handlePlayToggle(track)}
                disabled={!track.youtube_video_id || !isReady}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-primary hover:text-primary-foreground',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
                aria-label={
                  isCurrent && isPlaying ? 'Pause track' : 'Play track'
                }
              >
                {isCurrent && isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="ml-0.5 h-4 w-4" />
                )}
              </button>
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                {track.artwork ? (
                  <Image
                    src={track.artwork}
                    alt=""
                    width={44}
                    height={44}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Rows3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="max-w-[18rem] truncate text-sm font-medium text-foreground">
                  {track.title}
                </p>
                {track.position && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Track {track.position}
                  </p>
                )}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.artist, {
        id: 'artist',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            onClick={() => column.toggleSorting()}
          >
            Artist
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: ({ row }) => (
          <p
            className="max-w-[14rem] truncate text-sm text-muted-foreground"
            title={formatArtists(
              row.original.artist,
              row.original.extra_artists,
            )}
          >
            {formatArtists(row.original.artist, row.original.extra_artists)}
          </p>
        ),
      }),
      columnHelper.accessor((row) => row.genres, {
        id: 'genre',
        header: 'Genre / style',
        cell: ({ row }) => (
          <p className="max-w-[15rem] truncate text-sm text-muted-foreground">
            {formatGenres(row.original.genres, row.original.styles)}
          </p>
        ),
      }),
      columnHelper.accessor((row) => row.duration, {
        id: 'duration',
        header: 'Time',
        cell: ({ getValue }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {getValue() || '—'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const track = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => handleAddToQueue(track)}
                title="Add to queue"
                aria-label={`Add ${track.title} to queue`}
              >
                <ListPlus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => openPlaylistOptions(track)}
                title="Add to playlist"
                aria-label={`Add ${track.title} to playlist`}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      }),
    ],
    // The player and favorites state intentionally rebuild interactive cells.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playingTrackId, isPlaying, isReady, isTogglingFavorite, allTracks],
  );

  const globalFilter: FilterFn<CrateTrack> = (row, _columnId, value) => {
    const search = String(value).toLowerCase();
    const track = row.original;
    return [track.title, track.artist, track.genres, track.styles]
      .filter(Boolean)
      .some((field) => field?.toLowerCase().includes(search));
  };

  const table = useReactTable({
    data: allTracks,
    columns,
    state: { sorting, globalFilter: searchQuery, pagination },
    globalFilterFn: globalFilter,
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearchQuery,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (convexTracks === undefined) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="h-5 w-28 animate-pulse rounded bg-muted" />
          <div className="h-11 w-full max-w-md animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="flex h-20 items-center gap-4 border-b border-border/60 px-4 last:border-b-0"
            >
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="h-11 w-11 animate-pulse rounded-lg bg-muted" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const visibleRows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {allTracks.length} {allTracks.length === 1 ? 'track' : 'tracks'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Search, play, and organize without leaving your library.
          </p>
        </div>
        <div className="w-full sm:max-w-md">
          <SearchInput
            ref={searchInputRef}
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <Rows3 className="mx-auto h-7 w-7 text-muted-foreground" />
          <h2 className="mt-5 text-lg font-semibold text-foreground">
            {searchQuery
              ? 'No tracks match that search'
              : 'No tracks saved yet'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {searchQuery
              ? 'Try another artist, title, genre, or style.'
              : 'Explore your Discogs collection to find the music you want close at hand.'}
          </p>
          {searchQuery ? (
            <Button
              variant="outline"
              className="mt-6 rounded-full"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </Button>
          ) : (
            <Link
              to="/$username/collection"
              params={{ username: username ?? '' }}
              className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Explore Discogs
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {visibleRows.map((row) => {
              const track = row.original;
              const isCurrent = playingTrackId === track.id;
              const isFavorite = checkIsFavorite(track.id);
              return (
                <article
                  key={track.id}
                  className={cn(
                    'rounded-2xl border bg-card p-3',
                    isCurrent ? 'border-primary/40' : 'border-border/70',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {track.artwork ? (
                        <Image
                          src={track.artwork}
                          alt=""
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Rows3 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handlePlayToggle(track)}
                        disabled={!track.youtube_video_id || !isReady}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 text-white disabled:opacity-40"
                        aria-label={
                          isCurrent && isPlaying ? 'Pause track' : 'Play track'
                        }
                      >
                        {isCurrent && isPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {track.title}
                      </h3>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {formatArtists(track.artist, track.extra_artists)}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {formatGenres(track.genres, track.styles)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => handleToggleFavorite(track)}
                      disabled={isTogglingFavorite === track.id}
                      aria-label={
                        isFavorite
                          ? 'Remove from favorites'
                          : 'Add to favorites'
                      }
                    >
                      <Heart
                        className={cn(
                          'h-4 w-4',
                          isFavorite
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground',
                        )}
                      />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {track.duration || '—'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 rounded-lg px-3"
                        onClick={() => handleAddToQueue(track)}
                      >
                        <ListPlus className="mr-2 h-4 w-4" />
                        Queue
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 rounded-lg px-3"
                        onClick={() => openPlaylistOptions(track)}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Playlist
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-border/70 bg-card md:block">
            <table className="min-w-full">
              <thead className="border-b border-border/70 bg-muted/40">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        scope="col"
                        className={cn(
                          'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground',
                          header.column.id === 'favorite' && 'w-14',
                          header.column.id === 'duration' && 'w-20',
                          header.column.id === 'actions' && 'w-24 text-right',
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border/60">
                {visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'transition-colors hover:bg-muted/35',
                      playingTrackId === row.original.id &&
                        'bg-primary/[0.035]',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          'px-4 py-3',
                          cell.column.id === 'actions' && 'text-right',
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {filteredCount > 0 && (
        <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {visibleRows.length} of {filteredCount}{' '}
            {filteredCount === 1 ? 'track' : 'tracks'}
          </p>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-9 w-[118px] rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs tabular-nums text-muted-foreground">
              {table.getState().pagination.pageIndex + 1} /{' '}
              {Math.max(table.getPageCount(), 1)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={showPlaylistOptions !== null}
        onOpenChange={(open) => {
          if (!open) setShowPlaylistOptions(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to playlist</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-3">
            {convexPlaylists.length > 0 ? (
              convexPlaylists.map((playlist) => {
                const playlistId = playlist._id || playlist.id;
                return (
                  <Button
                    key={playlistId}
                    variant="outline"
                    className="min-h-11 justify-start rounded-xl"
                    onClick={() => {
                      if (selectedTrack) {
                        handleAddToPlaylist(playlistId, selectedTrack);
                      }
                    }}
                  >
                    <ListPlus className="mr-2 h-4 w-4" />
                    {playlist.title || playlist.name}
                  </Button>
                );
              })
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {playlistsLoading ? 'Loading playlists…' : 'No playlists yet'}
              </p>
            )}
            <Button
              variant="ghost"
              className="min-h-11 justify-start rounded-xl"
              onClick={() => {
                setIsCreatingPlaylist(true);
                setShowPlaylistOptions(null);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create a new playlist
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreatingPlaylist} onOpenChange={setIsCreatingPlaylist}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a playlist</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(event) => setNewPlaylistName(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  newPlaylistName.trim() &&
                  !isSavingPlaylist
                ) {
                  handleCreateNewPlaylist();
                }
                if (event.key === 'Escape') setIsCreatingPlaylist(false);
              }}
              disabled={isSavingPlaylist}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreatingPlaylist(false)}
              disabled={isSavingPlaylist}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewPlaylist}
              disabled={!newPlaylistName.trim() || isSavingPlaylist}
            >
              {isSavingPlaylist ? 'Creating…' : 'Create playlist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
