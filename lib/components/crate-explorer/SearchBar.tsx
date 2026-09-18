import { SearchBarProps } from '@/lib/types';
import { Input } from '@/lib/components/ui/input';
import { Search } from 'lucide-react';
import { LoadingSpinner } from '@/lib/components/ui/loading';

const SearchBar = ({ query, isLoading, onQueryChange }: SearchBarProps) => {
  return (
    <div className="relative mb-7 max-w-2xl">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        aria-label="Search Discogs releases"
        placeholder="Search by artist, album, label…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="h-12 w-full rounded-xl border-border/70 bg-card pl-11 pr-12 shadow-none"
      />
      {isLoading && (
        <LoadingSpinner className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" />
      )}
    </div>
  );
};

export default SearchBar;
