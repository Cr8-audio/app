import { useState } from 'react';
import { usePlayerStore } from '@/lib/stores';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { Button } from '@/lib/components/ui/button';
import { Card, CardContent } from '@/lib/components/ui/card';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  List,
  X,
  Music,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils/tailwind';
import { CrateTrack } from '@/lib/types';
import { Image } from '@unpic/react';
import { toast } from 'sonner';

const PersistentPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    isShuffleEnabled,
    isRepeatEnabled,
    queue,
    currentIndex,
    volume,
    currentTime,
    duration,
    playNext,
    playPrevious,
    togglePlayPause,
    toggleShuffle,
    toggleRepeat,
    setVolume,
    clearQueue,
    removeFromQueue,
    setQueue,
    seekTo,
  } = usePlayerStore();

  const [showQueue, setShowQueue] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);

  const { toggleFavorite, isFavorite } = useFavorites();

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleToggleFavorite = async (trackId: string) => {
    if (!trackId) return;

    const wasFavorite = isFavorite(trackId);

    try {
      await toggleFavorite(trackId);

      if (wasFavorite) {
        toast.success('Removed from favorites');
      } else {
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const handleTrackClick = (track: CrateTrack, index: number) => {
    const trackIndex = queue.findIndex((t: CrateTrack) => t.id === track.id);
    if (trackIndex !== -1) {
      setQueue(queue, trackIndex);
      togglePlayPause(track);
    }
  };

  const handleRemoveFromQueue = (trackId: string) => {
    removeFromQueue(trackId);
    toast.success('Track removed from queue');
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (!isNaN(newTime) && duration > 0) {
      seekTo(newTime);
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Don't show player if no track is playing or in queue
  if (!currentTrack && queue.length === 0) {
    return null;
  }

  return (
    <div className="w-full z-[60] bg-bg border-t-2 border-gray-800">
      {/* Queue Panel */}
      {showQueue && (
        <div className="max-h-96 overflow-y-auto bg-white border-t-2 border-gray-800">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">
                Queue ({queue.length} tracks)
              </h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearQueue()}
                  className="text-xs"
                >
                  Clear All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQueue(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {queue.map((track: CrateTrack, index: number) => (
                <div
                  key={track.id}
                  className={cn(
                    'flex items-center space-x-3 p-3 rounded-base border-2 border-gray-800 hover:bg-mainAccent/10 transition-colors cursor-pointer track-row',
                    index === currentIndex && 'bg-main/20',
                  )}
                  onClick={() => handleTrackClick(track, index)}
                >
                  <div className="w-8 h-8 bg-mainAccent border-2 border-gray-800 rounded-base flex items-center justify-center flex-shrink-0">
                    {index === currentIndex && isPlaying ? (
                      <Pause className="w-4 h-4 text-black" />
                    ) : (
                      <Play className="w-4 h-4 text-black" />
                    )}
                  </div>

                  {track.artwork ? (
                    <Image
                      src={track.artwork}
                      alt={track.title}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-base object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded-base flex items-center justify-center">
                      <Music className="w-4 h-4 text-gray-500" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate text-text">
                      {track.title}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {track.artist}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    {track.duration || '0:00'}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromQueue(track.id);
                    }}
                    className="h-8 w-8 p-0 icon-button"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Player */}
      <Card className="rounded-none border-0 shadow-none">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Progress Bar Section */}
            <div className="flex items-center space-x-2 w-24 sm:w-48">
              <span className="hidden sm:inline text-xs text-gray-500 font-mono w-8 text-right">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleProgressChange}
                  disabled={!duration}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(to right, #FFDC58 0%, #FFDC58 ${progressPercentage}%, #e5e5e5 ${progressPercentage}%, #e5e5e5 100%)`,
                  }}
                />
              </div>
              <span className="hidden sm:inline text-xs text-gray-500 font-mono w-8">
                {formatTime(duration)}
              </span>
            </div>

            {/* Current Track Info */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {currentTrack?.artwork ? (
                <Image
                  src={currentTrack.artwork}
                  alt={currentTrack.title}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-base object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-mainAccent border-2 border-black rounded-base flex items-center justify-center">
                  <Music className="w-5 h-5 text-black" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate text-text">
                  {currentTrack?.title || 'No track selected'}
                </div>
                <div className="text-xs text-gray-600 truncate">
                  {currentTrack?.artist || 'Unknown artist'}
                </div>
              </div>

              {/* Compact BPM and Genre Info */}
              {currentTrack && (
                <div className="flex items-center space-x-1">
                  {currentTrack.genres && currentTrack.genres.length > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-base text-xs font-medium bg-mainAccent2 border border-gray-800 text-black">
                      {currentTrack.genres[0]}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Favorite Button */}
            {currentTrack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleFavorite(currentTrack.id)}
                className={cn(
                  'h-8 w-8 p-0 border border-gray-800 rounded-base icon-button',
                  isFavorite(currentTrack.id)
                    ? 'bg-red-100 hover:bg-red-200 text-red-600'
                    : 'bg-white hover:bg-gray-100 text-gray-600',
                )}
              >
                <Heart
                  className={cn(
                    'w-4 h-4',
                    isFavorite(currentTrack.id) && 'fill-current',
                  )}
                />
              </Button>
            )}

            {/* Playback Controls */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleShuffle}
                className={cn(
                  'h-8 w-8 p-0 border border-gray-800 rounded-base icon-button',
                  isShuffleEnabled
                    ? 'bg-main hover:bg-mainAccent'
                    : 'bg-white hover:bg-gray-100',
                )}
              >
                <Shuffle className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={playPrevious}
                disabled={queue.length === 0}
                className="h-8 w-8 p-0 bg-white hover:bg-gray-100 border border-gray-800 rounded-base icon-button"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => currentTrack && togglePlayPause(currentTrack)}
                disabled={!currentTrack}
                className="h-10 w-10 p-0 bg-main hover:bg-mainAccent border-2 border-gray-800 rounded-base play-button"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-black" />
                ) : (
                  <Play className="w-5 h-5 text-black" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={playNext}
                disabled={queue.length === 0}
                className="h-8 w-8 p-0 bg-white hover:bg-gray-100 border border-gray-800 rounded-base icon-button"
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleRepeat}
                className={cn(
                  'h-8 w-8 p-0 border border-gray-800 rounded-base icon-button',
                  isRepeatEnabled
                    ? 'bg-main hover:bg-mainAccent'
                    : 'bg-white hover:bg-gray-100',
                )}
              >
                <Repeat className="w-4 h-4" />
              </Button>
            </div>

            {/* Volume & Queue Controls */}
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="h-8 w-8 p-0 bg-white hover:bg-gray-100 border border-gray-800 rounded-base icon-button"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>

                <div className="w-16">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) =>
                      handleVolumeChange([parseInt(e.target.value)])
                    }
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer interactive-element"
                    style={{
                      background: `linear-gradient(to right, #FFDC58 0%, #FFDC58 ${volume}%, #e5e5e5 ${volume}%, #e5e5e5 100%)`,
                    }}
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQueue(!showQueue)}
                className={cn(
                  'h-8 w-8 p-0 border border-gray-800 rounded-base icon-button',
                  showQueue
                    ? 'bg-main hover:bg-mainAccent'
                    : 'bg-white hover:bg-gray-100',
                )}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersistentPlayer;
