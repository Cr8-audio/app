import { Link, useParams } from '@tanstack/react-router';
import { CollectionRelease } from '@/lib/types';
import TrackGrid from '@/lib/components/crate-explorer/tracks/TrackGrid';
import { Button } from '@/lib/components/ui/button';
import { Disc3, ExternalLink } from 'lucide-react';

interface CollectionViewProps {
  isLoading: boolean;
  error: string | null;
  collection: CollectionRelease[];
  viewMode: 'grid' | 'list';
  needsConnection?: boolean;
}

const CollectionView = ({
  isLoading,
  error,
  collection,
  viewMode,
  needsConnection,
}: CollectionViewProps) => {
  const { username } = useParams({ strict: false });

  if (isLoading) {
    return (
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            : 'space-y-3'
        }
      >
        {Array.from({ length: viewMode === 'grid' ? 10 : 6 }).map(
          (_, index) => (
            <div
              key={index}
              className={
                viewMode === 'grid'
                  ? 'aspect-[4/5] animate-pulse rounded-2xl bg-muted'
                  : 'h-20 animate-pulse rounded-xl bg-muted'
              }
            />
          ),
        )}
      </div>
    );
  }

  if (needsConnection) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card px-6 py-16 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Disc3 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Bring your Discogs collection into Crate
        </h3>
        <p className="mb-6 mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Connect once to keep your records in sync and make every release
          available for listening and discovery here.
        </p>
        <Link
          to="/$username/settings/connections"
          params={{ username: username ?? '' }}
        >
          <Button className="rounded-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Connect Discogs
          </Button>
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (collection.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
        <Disc3 className="mx-auto h-6 w-6 text-muted-foreground" />
        <h3 className="mt-4 font-medium text-foreground">
          Your collection is ready for its first record
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Add releases on Discogs, then sync your connection to see them here.
        </p>
      </div>
    );
  }

  return (
    <TrackGrid
      viewMode={viewMode}
      items={collection.map((release) => ({
        id: release.id,
        title: `${(release.basic_information.artists ?? []).map((a) => a.name).join(', ')} - ${release.basic_information.title}`,
        thumb: release.basic_information.thumb,
        cover_image: release.basic_information.cover_image,
        year: String(release.basic_information.year),
        label: [
          (release.basic_information.labels ?? [])
            .map((l) => l.name)
            .join(', '),
        ],
        genre: release.basic_information.genres,
        style: release.basic_information.styles,
        format: [
          (release.basic_information.formats ?? [])
            .map((f) => f.name)
            .join(', '),
        ],
        type: 'release',
        uri: `https://www.discogs.com/release/${release.id}`,
        resource_url: `https://api.discogs.com/releases/${release.id}`,
        date_added: release.date_added,
      }))}
    />
  );
};

export default CollectionView;
