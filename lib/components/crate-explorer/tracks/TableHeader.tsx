import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/lib/components/ui/button';
import { OrderingConfig } from '@/lib/types';

interface TableHeaderProps {
  onSort: (column: OrderingConfig['orderBy']) => void;
}

export const TableHeader = ({ onSort }: TableHeaderProps) => {
  return (
    <thead className="bg-gray-50">
      <tr>
        <th
          scope="col"
          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          Actions
        </th>
        <th
          scope="col"
          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          Play/Position
        </th>
        <th
          scope="col"
          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          <div
            className="flex items-center cursor-pointer"
            onClick={() => onSort('title')}
          >
            <span>Title</span>
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        </th>
        <th
          scope="col"
          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          <div
            className="flex items-center cursor-pointer"
            onClick={() => onSort('artist')}
          >
            <span>Artist</span>
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        </th>
        <th
          scope="col"
          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          <div
            className="flex items-center cursor-pointer"
            onClick={() => onSort('genre')}
          >
            <span>Genre/Style</span>
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        </th>
        <th
          scope="col"
          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          <div
            className="flex items-center cursor-pointer"
            onClick={() => onSort('bpm')}
          >
            <span>BPM</span>
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        </th>
        <th
          scope="col"
          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          <div
            className="flex items-center cursor-pointer"
            onClick={() => onSort('duration')}
          >
            <span>Duration</span>
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        </th>
      </tr>
    </thead>
  );
};
