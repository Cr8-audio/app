import { Link } from '@tanstack/react-router';
import { DiscogsSearchResult } from '@/lib/types';
import SearchBar from '@/lib/components/crate-explorer/SearchBar';
import TrackGrid from '@/lib/components/crate-explorer/tracks/TrackGrid';
import { Button } from '@/lib/components/ui/button';
import { Music, ExternalLink } from 'lucide-react';

interface SearchViewProps {
  query: string;
  isLoading: boolean;
  error: string | null;
  results: DiscogsSearchResult[];
  onQueryChange: (query: string) => void;
  viewMode: 'grid' | 'list';
  needsConnection?: boolean;
}

const SearchView = ({
  query,
  isLoading,
  error,
  results,
  onQueryChange,
  viewMode,
  needsConnection,
}: SearchViewProps) => {
  return (
    <>
      <SearchBar
        query={query}
        isLoading={isLoading}
        onQueryChange={onQueryChange}
      />
      {needsConnection && query.length >= 3 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Connect Your Discogs Account
          </h3>
          <p className="text-gray-600 mb-6 max-w-md">
            To search Discogs, you need to connect your account first. This
            gives you access to millions of releases.
          </p>
          <Link to="/$username/settings/connections" params={{ username: '_' }}>
            <Button className="bg-main hover:bg-mainAccent border-2 border-gray-800 shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all">
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect Discogs
            </Button>
          </Link>
        </div>
      )}
      {error && !needsConnection && (
        <div className="text-red-500 dark:text-red-400 text-center py-4">
          {error}
        </div>
      )}
      {!error && !needsConnection && (
        <TrackGrid viewMode={viewMode} items={results} />
      )}
    </>
  );
};

export default SearchView;
