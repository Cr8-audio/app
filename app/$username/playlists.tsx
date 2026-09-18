import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowRight, ListMusic } from 'lucide-react';
import { PlaylistCard } from '@/lib/components/playlists/PlaylistCard';
import { Playlist } from '@/lib/components/playlists/Playlist';
import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { LoadingSpinner } from '@/lib/components/ui/loading';
import { LibraryHeader } from '@/lib/components/crate-explorer/LibraryHeader';

export const Route = createFileRoute('/$username/playlists')({
  component: PlaylistPage,
});

function PlaylistPage() {
  const { username } = useParams({ strict: false });
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(
    null,
  );
  const { playlists, isLoading } = usePlaylists();

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
              <Link
                to="/$username/tracks"
                params={{ username: username ?? '' }}
                className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Browse your tracks
                <ArrowRight className="h-4 w-4" />
              </Link>
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
    </main>
  );
}
