import { TrackDisplayProps } from '@/lib/types';
import TrackDisplayList from './TrackDisplayList';
import TrackDisplayGrid from './TrackDisplayGrid';
import { createContext, useContext } from 'react';

interface TrackContextType {
  result: any;
  isPlaying: boolean;
  isLoading?: boolean;
  onPlayToggle: () => void;
  dateAdded?: string;
}

export const TrackContext = createContext<TrackContextType | null>(null);

export const useTrackContext = () => {
  const context = useContext(TrackContext);
  if (!context) {
    throw new Error(
      'useTrackContext must be used within a TrackContextProvider',
    );
  }
  return context;
};

const TrackDisplay = ({
  result,
  isPlaying,
  isLoading,
  onPlayToggle,
  viewMode,
  dateAdded,
}: TrackDisplayProps) => {
  if (!result) return null;

  return (
    <TrackContext.Provider
      value={{ result, isPlaying, isLoading, onPlayToggle, dateAdded }}
    >
      {viewMode === 'list' ? <TrackDisplayList /> : <TrackDisplayGrid />}
    </TrackContext.Provider>
  );
};

export default TrackDisplay;
