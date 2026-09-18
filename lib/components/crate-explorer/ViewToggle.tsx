import { ViewToggleProps } from '@/lib/types';
import { Grid2X2, List } from 'lucide-react';
import { cn } from '@/lib/utils/tailwind';

const ViewToggle = ({ viewMode, onViewModeChange }: ViewToggleProps) => {
  return (
    <div
      className="flex w-fit items-center rounded-lg border border-border/70 bg-card p-1"
      aria-label="Display style"
    >
      <button
        type="button"
        onClick={() => onViewModeChange('grid')}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
          viewMode === 'grid'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
        aria-label="Grid view"
        aria-pressed={viewMode === 'grid'}
      >
        <Grid2X2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('list')}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
          viewMode === 'list'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
        aria-label="List view"
        aria-pressed={viewMode === 'list'}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ViewToggle;
