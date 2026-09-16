import { Button } from '@/lib/components/ui/button';
import { Search, Disc } from 'lucide-react';

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
  const buttonClass = (buttonView: 'search' | 'collection') => `
    px-4 py-2 rounded transition-colors flex items-center gap-2
    ${view === buttonView ? 'bg-main text-black' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'}
  `;

  return (
    <div className="flex gap-4">
      <Button
        onClick={() => onViewChange('search')}
        className={buttonClass('search')}
      >
        <Search size={18} />
        Search
      </Button>
      <Button
        onClick={() => onViewChange('collection')}
        className={buttonClass('collection')}
      >
        <Disc size={18} />
        Collection {collectionCount ? `(${collectionCount})` : ''}
      </Button>
    </div>
  );
};

export default ViewToggleButtons;
