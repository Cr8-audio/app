import { ViewToggleProps } from '@/lib/types';
import { Button } from '@/lib/components/ui/button';
import { Filter, Grid, List } from 'lucide-react';

const ViewToggle = ({ viewMode, onViewModeChange }: ViewToggleProps) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'list' ? 'default' : 'noShadow'}
          onClick={() => onViewModeChange('list')}
        >
          <List className="w-4 h-4 mr-2" />
          List
        </Button>
        <Button
          variant={viewMode === 'grid' ? 'default' : 'noShadow'}
          onClick={() => onViewModeChange('grid')}
        >
          <Grid className="w-4 h-4 mr-2" />
          Grid
        </Button>
      </div>
      <Button variant="noShadow" size="icon">
        <Filter className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ViewToggle;
