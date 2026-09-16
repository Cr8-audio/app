import { SearchBarProps } from '@/lib/types';
import { Input } from '@/lib/components/ui/input';
import { Button } from '@/lib/components/ui/button';
import { Search } from 'lucide-react';
import { LoadingSpinner } from '@/lib/components/ui/loading';

const SearchBar = ({ query, isLoading, onQueryChange }: SearchBarProps) => {
  return (
    <div className="flex gap-3 mb-6">
      <Input
        type="text"
        placeholder="Search vinyl records..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="flex-1"
      />
      <Button type="button" disabled={isLoading} variant="default">
        {isLoading ? (
          <LoadingSpinner className="w-4 h-4" />
        ) : (
          <Search className="w-4 h-4" />
        )}
        <span className="ml-2">Search</span>
      </Button>
    </div>
  );
};

export default SearchBar;
