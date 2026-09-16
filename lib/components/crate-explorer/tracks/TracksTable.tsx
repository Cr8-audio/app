'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { CrateTrack } from '@/lib/types';
import { usePlayerStore } from '@/lib/stores';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { SearchInput } from './SearchInput';
import { Button } from '@/lib/components/ui/button';
import {
  ArrowUpDown,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  ListPlus,
  Plus,
  Heart,
} from 'lucide-react';
import { Image } from '@unpic/react';
import { cn } from '@/lib/utils/tailwind';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  FilterFn,
  getPaginationRowModel,
  PaginationState,
} from '@tanstack/react-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/lib/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/lib/components/ui/dialog';
import { Input } from '@/lib/components/ui/input';
import { toast } from 'sonner';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function TracksTable() {
  const convexTracks = useQuery(api.tracks.getUserTracks);
  const allTracks = useMemo(() => {
    if (!convexTracks) return [];
    return convexTracks.map((track) => ({
      ...track,
      id: track.id || track._id,
    })) as CrateTrack[];
  }, [convexTracks]);

  const suggestedTrackIds = new Set<string>();

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [rowHover, setRowHover] = useState<string | null>(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<CrateTrack | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPlaylistOptions, setShowPlaylistOptions] = useState<string | null>(
    null,
  );
  const [playbackProgress, setPlaybackProgress] = useState<
    Record<string, number>
  >({});
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<string | null>(
    null,
  );

  // Use Convex favorites hook
  const { isFavorite: checkIsFavorite, toggleFavorite: convexToggleFavorite } =
    useFavorites();

  // Initialize player when component mounts
  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  const handlePlayToggle = async (track: CrateTrack) => {
    if (!track.youtube_video_id) {
      toast.error('No audio available for this track');
      return;
    }

    if (!isReady) {
      toast.error('Player is still loading...');
      return;
    }

    try {
      // Set up the queue with all tracks if not already set or if queue is empty
      const { queue, setQueue } = usePlayerStore.getState();
      if (queue.length === 0) {
        const trackIndex = allTracks.findIndex((t) => t.id === track.id);
        setQueue(allTracks, trackIndex);
        toast.success(`Added ${allTracks.length} tracks to queue`);
      }

      togglePlayPause(track);
    } catch (error) {
      console.error('Error playing track:', error);
      toast.error('Failed to play track');
    }
  };

  const handleAddToQueue = (track: CrateTrack) => {
    addToQueue(track);
    toast.success(`Added "${track.title}" to queue`);
  };

  const handleToggleFavorite = async (track: CrateTrack) => {
    setIsTogglingFavorite(track.id);
    try {
      const isFavorite = checkIsFavorite(track.id);
      await convexToggleFavorite(track.id);

      if (isFavorite) {
        toast.success('Removed from favorites');
      } else {
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setIsTogglingFavorite(null);
    }
  };

  const handleAddToPlaylist = async (playlistId: any, trackId: any) => {
    try {
      await addTrackToPlaylist(playlistId, trackId);
      // Toast is handled by the hook
    } catch (error) {
      // Error toast is handled by the hook
      console.error('Failed to add to playlist:', error);
    }
  };

  const handleCreateNewPlaylist = async () => {
    if (!newPlaylistName.trim() || isLoading || !selectedTrack) return;

    setIsLoading(true);
    try {
      const playlistId = await createPlaylist(newPlaylistName);

      if (playlistId && selectedTrack) {
        // Use the track's _id (Convex) or id (old format)
        const trackIdToUse = (selectedTrack as any)._id ?? selectedTrack.id;
        await addTrackToPlaylist(playlistId, trackIdToUse);
      }

      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
      // Toast is handled by the hook
    } catch (error) {
      console.error('Failed to create playlist:', error);
    } finally {
      setIsLoading(false);
      setSelectedTrack(null);
    }
  };

  useEffect(() => {
    if (allTracks.length > 0) {
      setLoading(false);
    }
  }, [allTracks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatArtists = (artist: string, extraArtists: string | null) => {
    if (!extraArtists) return artist;
    return `${artist}, ${extraArtists}`;
  };

  const formatList = (list: string | null) => {
    if (!list) return '-';
    return list.split(',').join(', ');
  };

  const columnHelper = createColumnHelper<CrateTrack>();

  const columns = useMemo(
    () => [
      // Favorites column
      columnHelper.display({
        id: 'favorite',
        header: '',
        cell: ({ row }) => {
          const track = row.original;
          const isFavorite = checkIsFavorite(track.id);
          const isToggling = isTogglingFavorite === track.id;

          return (
            <Button
              variant="noShadow"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleToggleFavorite(track)}
              disabled={isToggling}
            >
              <Heart
                className={cn(
                  'h-4 w-4 transition-colors',
                  isFavorite
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-400 hover:text-red-500',
                )}
              />
            </Button>
          );
        },
      }),
      // Combined Play/Position column with contextual actions
      columnHelper.display({
        id: 'playActions',
        header: 'Track',
        cell: ({ row }) => {
          const track = row.original;
          const isHovering = rowHover === track.id;

          return (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Button
                  variant="noShadow"
                  size="icon"
                  className={cn(
                    'h-8 w-8 relative z-10',
                    playingTrackId === track.id && 'bg-main/20',
                  )}
                  onClick={() => handlePlayToggle(track)}
                  disabled={!track.youtube_video_id || !isReady}
                >
                  {playingTrackId === track.id && isPlaying ? (
                    <>
                      <Pause className="h-4 w-4" />
                      <span className="absolute inset-0 rounded-full animate-pulse-light bg-main/30" />
                    </>
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                {playingTrackId === track.id && (
                  <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-main transition-all duration-300 ease-linear"
                      style={{ width: `${playbackProgress[track.id] || 0}%` }}
                    />
                  </div>
                )}
                {track.position && (
                  <span className="absolute -top-2 -right-2 text-xs px-1 bg-gray-100 rounded-full text-gray-500">
                    {track.position}
                  </span>
                )}
              </div>

              {track.artwork ? (
                <div className="h-10 w-10 flex-shrink-0">
                  <Image
                    src={track.artwork}
                    alt={track.title}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-sm object-cover"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-sm" />
              )}

              <div className="text-sm font-medium text-gray-900 max-w-[16rem] relative overflow-hidden">
                <div
                  className={cn(
                    'whitespace-nowrap',
                    isHovering && track.title.length > 30 && 'hover-marquee',
                  )}
                >
                  {track.title}
                </div>
              </div>

              {/* Add to playlist action that appears on hover */}
              {isHovering && (
                <div className="flex items-center ml-2 animate-fadeIn space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToQueue(track);
                    }}
                    title="Add to queue"
                  >
                    <ListPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrack(track);
                      setShowPlaylistOptions(track.id);
                    }}
                    title="Add to playlist"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.artist, {
        id: 'artist',
        header: ({ column }) => (
          <div
            className="flex items-center cursor-pointer"
            onClick={() => column.toggleSorting()}
          >
            <span>Artist</span>
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        ),
        cell: ({ row }) => {
          const track = row.original;
          const isHovering = rowHover === track.id;
          const artist = formatArtists(track.artist, track.extra_artists);
          return (
            <div className="text-sm text-gray-500 max-w-[18rem] overflow-hidden">
              <div
                className={cn(
                  'whitespace-nowrap',
                  isHovering && artist.length > 15 && 'marquee-text',
                )}
              >
                <ArtistPreview artist={track.artist}>{artist}</ArtistPreview>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.genres, {
        id: 'genre_style',
        header: ({ column }) => (
          <div
            className="flex items-center cursor-pointer"
            onClick={() => column.toggleSorting()}
          >
            <span>Genre/Style</span>
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        ),
        cell: ({ row }) => {
          const track = row.original;
          const isHovering = rowHover === track.id;
          const genreStyle = [
            track.genres && formatList(track.genres),
            track.styles && formatList(track.styles),
          ]
            .filter(Boolean)
            .join(' / ');

          return (
            <div className="text-sm text-gray-500 max-w-[18rem] relative overflow-hidden">
              <div
                className={cn(
                  'whitespace-nowrap',
                  isHovering && genreStyle.length > 20 && 'hover-marquee',
                )}
              >
                {genreStyle}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.duration, {
        id: 'duration',
        header: ({ column }) => (
          <div
            className="flex items-center cursor-pointer"
            onClick={() => column.toggleSorting()}
          >
            <span>Duration</span>
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        ),
        cell: ({ getValue }) => (
          <div className="text-sm text-gray-500">{getValue() || '-'}</div>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playingTrackId, isReady, isPlaying, rowHover, isTogglingFavorite],
  );

  const globalFilter: FilterFn<CrateTrack> = (row, columnId, value) => {
    const searchLower = value.toLowerCase();
    const track = row.original;
    return (
      track.title.toLowerCase().includes(searchLower) ||
      track.artist.toLowerCase().includes(searchLower) ||
      (track.genres?.toLowerCase() || '').includes(searchLower) ||
      (track.styles?.toLowerCase() || '').includes(searchLower)
    );
  };

  const table = useReactTable({
    data: allTracks,
    columns,
    state: {
      sorting,
      globalFilter: searchQuery,
      pagination,
    },
    globalFilterFn: globalFilter,
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearchQuery,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
    debugTable: process.env.NODE_ENV === 'development',
  });

  useEffect(() => {
    if (!playingTrackId) return;

    // Start at 0 progress when a new track starts playing
    if (!playbackProgress[playingTrackId]) {
      setPlaybackProgress((prev) => ({ ...prev, [playingTrackId]: 0 }));
    }

    // Simulate progress updates (in a real app, this would come from the actual audio player)
    const interval = setInterval(() => {
      setPlaybackProgress((prev) => {
        const currentProgress = prev[playingTrackId] || 0;
        if (currentProgress >= 100) {
          clearInterval(interval);
          return prev;
        }
        return { ...prev, [playingTrackId]: currentProgress + 1 };
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [playingTrackId]);

  if (loading && allTracks.length === 0) {
    return (
      <div className="space-y-4 ml-8">
        <div className="flex justify-between items-center mb-4">
          <div className="w-40 h-9 bg-gray-200 animate-pulse rounded-md"></div>
          <div className="w-64 h-9 bg-gray-200 animate-pulse rounded-md"></div>
        </div>

        <div className="relative overflow-x-auto rounded-md border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Array.from({ length: 6 }).map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray-100">
                  <td className="px-4 py-4">
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="h-10 w-10 bg-gray-200 rounded-sm animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 bg-gray-200 rounded w-36 animate-pulse"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 bg-gray-200 rounded w-10 animate-pulse"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  // Add a custom CSS block at the end of the component
  const marqueeStyles = `
    @keyframes limited-marquee {
      0% { transform: translateX(0); }
      20% { transform: translateX(0); }
      80% { transform: translateX(calc(-100% + 100%)); }
      100% { transform: translateX(0); }
    }
    
    .hover-marquee {
      animation: limited-marquee 3s ease-in-out;
      animation-iteration-count: 1;
      display: inline-block;
      position: relative;
      max-width: 100%;
    }

    @keyframes marquee-animation {
      0% { transform: translateX(0); }
      10% { transform: translateX(0); }
      90% { transform: translateX(max(-100%, -300px)); }
      100% { transform: translateX(0); }
    }
    
    .marquee-text {
      animation: marquee-animation 3s ease-in-out;
      display: inline-block;
      white-space: nowrap;
    }
    
    /* Ensure containers don't grow with content */
    [class*="max-w-"] {
      overflow: hidden;
    }
    
    /* Pulse animation for currently playing track */
    @keyframes pulse-light {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.7; }
    }
    
    .animate-pulse-light {
      animation: pulse-light 2s ease-in-out infinite;
    }
  `;

  return (
    <div className="space-y-4 ml-8">
      <style>{marqueeStyles}</style>
      <div className="flex justify-between items-center mb-4">
        <div></div>
        <SearchInput
          ref={searchInputRef}
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <div className="relative overflow-x-auto rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
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
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => {
              const track = row.original;
              const isSuggested = suggestedTrackIds.has(track.id);
              const isFirstSuggested =
                isSuggested &&
                (row.index === 0 ||
                  !suggestedTrackIds.has(
                    table.getRowModel().rows[row.index - 1]?.original.id,
                  ));
              const isLastSuggested =
                isSuggested &&
                (row.index === table.getRowModel().rows.length - 1 ||
                  !suggestedTrackIds.has(
                    table.getRowModel().rows[row.index + 1]?.original.id,
                  ));

              return (
                <tr
                  key={track.id}
                  className={cn(
                    'hover:bg-accent/5 group relative transition-all duration-300',
                    isSuggested && [
                      'bg-gradient-to-r from-main/[0.03] to-main/[0.07]',
                      'border-l-[3px] border-main/40',
                      'shadow-[inset_0_0_40px_rgba(0,0,0,0.02)]',
                    ],
                    playingTrackId === track.id && [
                      'bg-main/[0.03]',
                      'border-l-[3px] border-main/60',
                      'shadow-[inset_0_0_30px_rgba(0,0,0,0.01)]',
                    ],
                  )}
                  onMouseEnter={() => setRowHover(track.id)}
                  onMouseLeave={() => setRowHover(null)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-4 whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}

                  {isFirstSuggested && (
                    <div className="absolute -top-px left-0 right-0 h-px bg-main/10" />
                  )}
                  {isLastSuggested && (
                    <div className="absolute -bottom-px left-0 right-0 h-px bg-main/10" />
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create New Playlist Dialog */}
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

      {/* Playlist Options Dialog */}
      <Dialog
        open={showPlaylistOptions !== null}
        onOpenChange={(open) => !open && setShowPlaylistOptions(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Playlist</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {convexPlaylists && convexPlaylists.length > 0 ? (
              <div className="grid gap-2">
                {convexPlaylists.map((playlist: any) => (
                  <Button
                    key={playlist._id || playlist.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      if (selectedTrack && showPlaylistOptions) {
                        const trackIdToUse =
                          (selectedTrack as any)._id ?? selectedTrack.id;
                        handleAddToPlaylist(
                          playlist._id || playlist.id,
                          trackIdToUse,
                        );
                        setShowPlaylistOptions(null);
                      }
                    }}
                  >
                    <ListPlus className="mr-2 h-4 w-4" />
                    {playlist.title || playlist.name}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-muted-foreground">
                {playlistsLoading ? 'Loading playlists...' : 'No playlists yet'}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setIsCreatingPlaylist(true);
                setShowPlaylistOptions(null);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Playlist
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pagination Controls - Fixed position at the bottom */}
      <div className="flex items-center justify-between sticky bottom-4 bg-white border rounded-md p-2 shadow-sm">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500">
            Page{' '}
            <strong>
              {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </strong>
          </p>
          <p className="text-sm text-gray-500 hidden md:block">
            | Displaying {table.getRowModel().rows.length} of{' '}
            {table.getFilteredRowModel().rows.length} tracks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500 hidden sm:inline">
              Rows per page:
            </span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 30, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="hidden sm:flex h-8 w-8 p-0 lg:flex"
            >
              <span className="sr-only">Go to first page</span>
              <ChevronLeft className="h-4 w-4" />
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="hidden sm:flex h-8 w-8 p-0 lg:flex"
            >
              <span className="sr-only">Go to last page</span>
              <ChevronRight className="h-4 w-4" />
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Artist Preview Component - Simple approach with CSS-only tooltip
function ArtistPreview({
  artist,
  children,
}: {
  artist: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group inline-block">
      <span className="cursor-pointer hover:text-primary hover:underline underline-offset-2">
        {children}
      </span>
      <div className="absolute left-0 top-full mt-2 w-64 rounded-md bg-background/95 p-3 shadow-lg ring-1 ring-border z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
        <div className="flex flex-col space-y-2">
          <h4 className="text-sm font-semibold">{artist}</h4>
          <div className="flex items-center">
            <span className="bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5 mr-2">
              Artist
            </span>
            <span className="text-xs text-muted-foreground">
              View all tracks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
