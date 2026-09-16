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
      <div className="relative w-full p-[4px]">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full pl-12 pr-8',
            'transition-shadow duration-300',
            'hover:shadow-hover',
            'focus:shadow-focus',
          )}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
