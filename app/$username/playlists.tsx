import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { PlaylistCard } from '@/lib/components/playlists/PlaylistCard';
import { Playlist } from '@/lib/components/playlists/Playlist';
import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { PlaylistWithTracks } from '@/lib/types';
import { PageHeader } from '@/lib/components/layout/Navigation/Breadcrumbs';
import { LoadingSpinner } from '@/lib/components/ui/loading';

export const Route = createFileRoute('/$username/playlists')({
  component: PlaylistPage,
});

function PlaylistPage() {
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(
    null,
  );
  const { playlists, isLoading } = usePlaylists();

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Playlists"
          description="Create and manage your music playlists"
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </>
    );
  }

  const handlePlaylistClick = (playlist: any) => {
    const playlistId = playlist._id || playlist.id;
    setExpandedPlaylistId((currentId) =>
      currentId === playlistId ? null : playlistId,
    );
  };

  const handlePlaylistExpand = (playlistId: string) => {
    setExpandedPlaylistId(playlistId);
  };

  return (
    <>
      <PageHeader
        title="Playlists"
        description="Create and manage your music playlists"
      />
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          {playlists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No playlists yet</p>
              <p className="text-sm mt-2">
                Create your first playlist from the Tracks page
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {playlists.map((playlist: any) => (
                <PlaylistCard
                  key={playlist._id || playlist.id}
                  playlist={playlist}
                  handleClick={() => handlePlaylistClick(playlist)}
                  onExpand={() =>
                    handlePlaylistExpand(playlist._id || playlist.id)
                  }
                />
              ))}
            </div>
          )}

          {expandedPlaylistId && (
            <div className="mt-12">
              <Playlist activePlaylistId={expandedPlaylistId} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
