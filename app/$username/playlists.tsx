import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowRight, ListMusic, Plus } from 'lucide-react';
import { PlaylistCard } from '@/lib/components/playlists/PlaylistCard';
import { Playlist } from '@/lib/components/playlists/Playlist';
import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { LoadingSpinner } from '@/lib/components/ui/loading';
import { LibraryHeader } from '@/lib/components/crate-explorer/LibraryHeader';
import { Button } from '@/lib/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog';
import { Input } from '@/lib/components/ui/input';

export const Route = createFileRoute('/$username/playlists')({
  component: PlaylistPage,
});

function PlaylistPage() {
  const { username } = useParams({ strict: false });
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { playlists, isLoading, createPlaylist } = usePlaylists();

  const createNewPlaylist = async () => {
    const title = newTitle.trim();
    if (!title || isCreating) return;

    setIsCreating(true);
    try {
      const playlistId = await createPlaylist(
        title,
        newDescription.trim() || undefined,
      );
      if (playlistId) setExpandedPlaylistId(playlistId);
      setNewTitle('');
      setNewDescription('');
      setCreateOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <LibraryHeader
          active="playlists"
          title="Playlists"
          description="Small worlds built from the music you keep coming back to."
        />
        <div className="flex min-h-[360px] items-center justify-center">
          <LoadingSpinner />
        </div>
      </main>
    );
  }

  const handlePlaylistClick = (playlist: (typeof playlists)[number]) => {
    const playlistId = playlist._id || playlist.id;
    setExpandedPlaylistId((currentId) =>
      currentId === playlistId ? null : playlistId,
    );
  };

  const handlePlaylistExpand = (playlistId: string) => {
    setExpandedPlaylistId(playlistId);
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <LibraryHeader
        active="playlists"
        title="Playlists"
        description="Small worlds built from the music you keep coming back to."
      />
      <div className="py-8 sm:py-10">
        <div className="mb-6 flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {playlists.length}{' '}
              {playlists.length === 1 ? 'playlist' : 'playlists'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Build the order, add a note, then publish a listening link.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-10 rounded-full px-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            New playlist
          </Button>
        </div>

        {playlists.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-16 text-center sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
            <div className="relative mx-auto flex max-w-lg flex-col items-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/70 bg-background text-primary">
                <ListMusic className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Your first playlist starts with one track
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Open your tracks, choose a song, and use its playlist action to
                create a new collection or add to an existing one.
              </p>
              <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="min-h-11 rounded-full px-5"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create a playlist
                </Button>
                <Link
                  to="/$username/tracks"
                  params={{ username: username ?? '' }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Browse your tracks
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {playlists.map((playlist) => {
              const playlistId = playlist._id || playlist.id;

              return (
                <PlaylistCard
                  key={playlistId}
                  playlist={playlist}
                  handleClick={() => handlePlaylistClick(playlist)}
                  onExpand={() => handlePlaylistExpand(playlistId)}
                  isExpanded={expandedPlaylistId === playlistId}
                />
              );
            })}
          </div>
        )}

        {expandedPlaylistId && (
          <div className="mt-10 scroll-mt-6 rounded-3xl border border-border/70 bg-card p-4 sm:p-6 lg:p-8">
            <Playlist activePlaylistId={expandedPlaylistId} />
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl tracking-tight">
              Start a playlist
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void createNewPlaylist();
            }}
          >
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Title
              </span>
              <Input
                autoFocus
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Sunday warm-up"
                maxLength={80}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Note
              </span>
              <textarea
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                placeholder="A low-slung opening hour…"
                maxLength={280}
                rows={4}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!newTitle.trim() || isCreating}>
                {isCreating ? 'Creating…' : 'Create playlist'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
