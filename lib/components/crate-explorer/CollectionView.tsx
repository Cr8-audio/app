import { Link } from '@tanstack/react-router';
import { CollectionRelease } from '@/lib/types';
import TrackGrid from '@/lib/components/crate-explorer/tracks/TrackGrid';
import { Button } from '@/lib/components/ui/button';
import { Music, ExternalLink } from 'lucide-react';

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
  if (isLoading) return <div>Loading collection...</div>;

  if (needsConnection) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Music className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          Connect Your Discogs Account
        </h3>
        <p className="text-gray-600 mb-6 max-w-md">
          To view your collection, you need to connect your Discogs account
          first. This will sync your vinyl and physical music collection.
        </p>
        <Link to="/$username/settings/connections" params={{ username: '_' }}>
          <Button className="bg-main hover:bg-mainAccent border-2 border-gray-800 shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all">
            <ExternalLink className="w-4 h-4 mr-2" />
            Connect Discogs
          </Button>
        </Link>
      </div>
    );
  }

  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <TrackGrid
      viewMode={viewMode}
      items={collection.map((release) => ({
        id: release.basic_information.id,
        title: `${release.basic_information.artists.map((a) => a.name).join(', ')} - ${release.basic_information.title}`,
        thumb: release.basic_information.thumb,
        cover_image: release.basic_information.cover_image,
        year: String(release.basic_information.year),
        label: [release.basic_information.labels.map((l) => l.name).join(', ')],
        genre: release.basic_information.genres,
        style: release.basic_information.styles,
        format: [
          release.basic_information.formats.map((f) => f.name).join(', '),
        ],
        type: 'release',
        uri: `https://www.discogs.com/release/${release.basic_information.id}`,
        resource_url: `https://api.discogs.com/releases/${release.basic_information.id}`,
        date_added: release.date_added,
      }))}
    />
  );
};

export default CollectionView;
