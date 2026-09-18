import { Link, useParams } from '@tanstack/react-router';
import { DiscogsSearchResult } from '@/lib/types';
import SearchBar from '@/lib/components/crate-explorer/SearchBar';
import TrackGrid from '@/lib/components/crate-explorer/tracks/TrackGrid';
import { Button } from '@/lib/components/ui/button';
import { Disc3, ExternalLink, Search } from 'lucide-react';

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
  const { username } = useParams({ strict: false });
  const hasSearch = query.trim().length >= 3;

  return (
    <>
      <SearchBar
        query={query}
        isLoading={isLoading}
        onQueryChange={onQueryChange}
      />
      {needsConnection && query.length >= 3 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card px-6 py-16 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Disc3 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Connect your Discogs account
          </h3>
          <p className="mb-6 mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            To search Discogs, you need to connect your account first. This
            gives you access to millions of releases.
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
      )}
      {error && !needsConnection && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {!hasSearch && !error && !needsConnection && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <Search className="mx-auto h-6 w-6 text-muted-foreground" />
          <h3 className="mt-4 font-medium text-foreground">
            Search the Discogs catalog
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Try an artist, release title, or label. Enter at least three
            characters to start exploring.
          </p>
        </div>
      )}
      {hasSearch &&
        !isLoading &&
        results.length === 0 &&
        !error &&
        !needsConnection && (
          <div className="rounded-2xl border border-border/70 bg-card px-6 py-14 text-center">
            <h3 className="font-medium text-foreground">No releases found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a broader artist, album, or label name.
            </p>
          </div>
        )}
      {results.length > 0 && !error && !needsConnection && (
        <TrackGrid viewMode={viewMode} items={results} />
      )}
    </>
  );
};

export default SearchView;
