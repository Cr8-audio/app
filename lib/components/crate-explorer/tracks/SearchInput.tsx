import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/lib/components/ui/input';
import { cn } from '@/lib/utils/tailwind';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, placeholder = 'Search tracks...' }, ref) => {
    return (
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          type="text"
          aria-label="Search your tracks"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'h-11 w-full rounded-xl border-border/70 bg-card pl-11 pr-11 shadow-none',
            'transition-colors focus:border-primary/50',
          )}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
