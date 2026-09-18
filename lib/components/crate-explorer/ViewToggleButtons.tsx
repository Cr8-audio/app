import { Search, Disc } from 'lucide-react';
import { cn } from '@/lib/utils/tailwind';

interface ViewToggleButtonsProps {
  view: 'search' | 'collection';
  onViewChange: (view: 'search' | 'collection') => void;
  collectionCount?: number;
}

const ViewToggleButtons = ({
  view,
  onViewChange,
  collectionCount,
}: ViewToggleButtonsProps) => {
  return (
    <div
      className="inline-flex w-full rounded-xl border border-border/70 bg-card p-1 sm:w-auto"
      role="tablist"
      aria-label="Discogs views"
    >
      <button
        type="button"
        role="tab"
        aria-selected={view === 'collection'}
        onClick={() => onViewChange('collection')}
        className={cn(
          'flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors sm:flex-none',
          view === 'collection'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Disc className="h-4 w-4" />
        Your collection
        {collectionCount !== undefined && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {collectionCount}
          </span>
        )}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'search'}
        onClick={() => onViewChange('search')}
        className={cn(
          'flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors sm:flex-none',
          view === 'search'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Search className="h-4 w-4" />
        Search releases
      </button>
    </div>
  );
};

export default ViewToggleButtons;
