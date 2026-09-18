import { useState } from 'react';
import { usePlayerStore } from '@/lib/stores';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { Button } from '@/lib/components/ui/button';
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

interface PersistentPlayerProps {
  showFavoriteAction?: boolean;
}

const PersistentPlayer = ({
  showFavoriteAction = true,
}: PersistentPlayerProps) => {
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
      setPreviousVolume(newVolume);
      setIsMuted(false);
    } else {
      if (volume > 0) setPreviousVolume(volume);
      setIsMuted(true);
    }
  };

  const toggleMute = () => {
    if (isMuted || volume === 0) {
      setVolume(previousVolume > 0 ? previousVolume : 80);
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

  const handleTrackClick = (track: CrateTrack) => {
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
  const primaryGenre = currentTrack?.genres?.split(',')[0]?.trim();

  // Don't show player if no track is playing or in queue
  if (!currentTrack && queue.length === 0) {
    return null;
  }

  return (
    <div className="relative z-[60] w-full bg-[#20211f] pb-[env(safe-area-inset-bottom)] text-[#f6f2e9] shadow-[0_-12px_36px_rgba(27,28,26,0.16)] sm:pb-0">
      {showQueue && (
        <div
          id="player-queue"
          className="max-h-[min(55vh,30rem)] overflow-y-auto border-y border-black/10 bg-[#f4f0e7] text-[#282925]"
        >
          <div className="mx-auto w-full max-w-[96rem] px-3 pb-4 sm:px-6 sm:pb-6">
            <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center justify-between border-b border-black/8 bg-[#f4f0e7]/95 px-3 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 sm:py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
                  Playing next
                </p>
                <h3 className="mt-0.5 text-base font-semibold tracking-[-0.01em] sm:text-lg">
                  Queue
                  <span className="ml-2 font-normal text-black/45">
                    {queue.length}
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearQueue()}
                  disabled={queue.length === 0}
                  className="h-9 rounded-full bg-black/[0.045] px-3 text-[11px] font-semibold text-black/60 hover:bg-black/[0.08] hover:text-black"
                  aria-label="Clear the play queue"
                  title="Clear queue"
                >
                  Clear queue
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQueue(false)}
                  className="h-9 w-9 rounded-full text-black/55 hover:bg-black/[0.07] hover:text-black"
                  aria-label="Close play queue"
                  title="Close queue"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-black/8 bg-white/40 px-4 text-center">
                <Music className="mb-2 h-5 w-5 text-black/30" />
                <p className="text-sm font-medium text-black/65">
                  Your queue is empty
                </p>
                <p className="mt-1 text-xs text-black/40">
                  Add a track to keep the session moving.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {queue.map((track: CrateTrack, index: number) => (
                  <div
                    key={track.id}
                    className={cn(
                      'group grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-1 rounded-xl border border-transparent transition-colors',
                      index === currentIndex
                        ? 'border-[#5f7cff]/25 bg-white/75'
                        : 'hover:bg-white/55',
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-3 rounded-xl p-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#5f7cff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f0e7] sm:p-3"
                      onClick={() => handleTrackClick(track)}
                      aria-current={index === currentIndex ? 'true' : undefined}
                      aria-label={
                        index === currentIndex && isPlaying
                          ? `Pause ${track.title} by ${track.artist}`
                          : `Play ${track.title} by ${track.artist}`
                      }
                      title={`${track.title} — ${track.artist}`}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                          index === currentIndex
                            ? 'bg-[#5f7cff] text-white'
                            : 'bg-black/[0.055] text-black/55 group-hover:bg-black/[0.085]',
                        )}
                        aria-hidden="true"
                      >
                        {index === currentIndex && isPlaying ? (
                          <Pause className="h-3.5 w-3.5" fill="currentColor" />
                        ) : (
                          <Play
                            className="ml-0.5 h-3.5 w-3.5"
                            fill="currentColor"
                          />
                        )}
                      </span>

                      {track.artwork ? (
                        <Image
                          src={track.artwork}
                          alt=""
                          width={44}
                          height={44}
                          className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-black/10"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#e5dfd4] text-black/35 ring-1 ring-black/5">
                          <Music className="h-4 w-4" />
                        </span>
                      )}

                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block truncate text-sm font-semibold tracking-[-0.01em]',
                            index === currentIndex
                              ? 'text-[#405bcc]'
                              : 'text-black/80',
                          )}
                        >
                          {track.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-black/45">
                          {track.artist}
                        </span>
                      </span>

                      <span className="hidden shrink-0 font-mono text-[11px] tabular-nums text-black/35 sm:block">
                        {track.duration || '0:00'}
                      </span>
                    </button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFromQueue(track.id)}
                      disabled={track.id === currentTrack?.id}
                      className="mr-1 h-9 w-9 rounded-full text-black/35 hover:bg-black/[0.06] hover:text-black/70"
                      aria-label={
                        track.id === currentTrack?.id
                          ? `${track.title} is currently playing`
                          : `Remove ${track.title} from queue`
                      }
                      title={
                        track.id === currentTrack?.id
                          ? 'Currently playing'
                          : 'Remove from queue'
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-x-0 top-0 z-10 h-3 -translate-y-1/2 focus-within:ring-2 focus-within:ring-[#6f87ff]/65 focus-within:ring-offset-1 focus-within:ring-offset-[#20211f]">
          <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15">
            <span
              className="block h-full bg-[#7087ff] transition-[width] duration-150"
              style={{ width: `${progressPercentage}%` }}
            />
          </span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            disabled={!duration}
            aria-label="Seek through track"
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            title="Seek"
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 disabled:cursor-not-allowed"
          />
        </div>

        <div className="mx-auto grid min-h-[7.25rem] w-full max-w-[96rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-3 pb-3 pt-4 sm:min-h-[5.75rem] sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-x-5 sm:px-5 sm:pb-3 sm:pt-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:max-w-[min(26rem,34vw)]">
            {currentTrack?.artwork ? (
              <Image
                src={currentTrack.artwork}
                alt={`${currentTrack.title} artwork`}
                width={56}
                height={56}
                className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-white/10 sm:h-14 sm:w-14"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-white/35 ring-1 ring-white/10 sm:h-14 sm:w-14">
                <Music className="h-5 w-5" />
              </div>
            )}

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-[-0.01em] text-[#f6f2e9]">
                {currentTrack?.title || 'No track selected'}
              </div>
              <div className="mt-0.5 truncate text-xs text-white/45">
                {currentTrack?.artist || 'Unknown artist'}
              </div>
              {primaryGenre && (
                <div className="mt-1.5 hidden sm:block">
                  <span className="rounded-full bg-white/[0.07] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">
                    {primaryGenre}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-2 row-start-2 flex items-center justify-center gap-1.5 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleShuffle}
              aria-label={
                isShuffleEnabled ? 'Turn shuffle off' : 'Turn shuffle on'
              }
              aria-pressed={isShuffleEnabled}
              title={isShuffleEnabled ? 'Shuffle on' : 'Shuffle off'}
              className={cn(
                'hidden h-9 w-9 rounded-full sm:inline-flex',
                isShuffleEnabled
                  ? 'bg-[#5f7cff] text-white hover:bg-[#7087ff] hover:text-white'
                  : 'text-white/45 hover:bg-white/[0.08] hover:text-white',
              )}
            >
              <Shuffle className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={playPrevious}
              disabled={queue.length === 0}
              className="h-10 w-10 rounded-full text-white/70 hover:bg-white/[0.08] hover:text-white"
              aria-label="Play previous track"
              title="Previous track"
            >
              <SkipBack className="h-[18px] w-[18px]" fill="currentColor" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => currentTrack && togglePlayPause(currentTrack)}
              disabled={!currentTrack}
              className="h-12 w-12 rounded-full bg-[#f6f2e9] text-[#20211f] shadow-[0_5px_18px_rgba(0,0,0,0.2)] hover:scale-[1.03] hover:bg-white hover:text-black active:scale-[0.98] sm:h-[3.25rem] sm:w-[3.25rem]"
              aria-label={
                isPlaying ? 'Pause current track' : 'Play current track'
              }
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={playNext}
              disabled={queue.length === 0}
              className="h-10 w-10 rounded-full text-white/70 hover:bg-white/[0.08] hover:text-white"
              aria-label="Play next track"
              title="Next track"
            >
              <SkipForward className="h-[18px] w-[18px]" fill="currentColor" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              aria-label={
                isRepeatEnabled ? 'Turn repeat off' : 'Turn repeat on'
              }
              aria-pressed={isRepeatEnabled}
              title={isRepeatEnabled ? 'Repeat on' : 'Repeat off'}
              className={cn(
                'hidden h-9 w-9 rounded-full sm:inline-flex',
                isRepeatEnabled
                  ? 'bg-[#5f7cff] text-white hover:bg-[#7087ff] hover:text-white'
                  : 'text-white/45 hover:bg-white/[0.08] hover:text-white',
              )}
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>

          <div className="col-start-2 row-start-1 flex items-center justify-end gap-1 sm:col-start-3 sm:gap-1.5">
            {showFavoriteAction && currentTrack && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleToggleFavorite(currentTrack.id)}
                aria-label={
                  isFavorite(currentTrack.id)
                    ? 'Remove current track from favorites'
                    : 'Add current track to favorites'
                }
                aria-pressed={isFavorite(currentTrack.id)}
                title={
                  isFavorite(currentTrack.id)
                    ? 'Remove from favorites'
                    : 'Add to favorites'
                }
                className={cn(
                  'h-10 w-10 rounded-full hover:bg-white/[0.08]',
                  isFavorite(currentTrack.id)
                    ? 'text-[#8296ff] hover:text-[#9dacff]'
                    : 'text-white/45 hover:text-white',
                )}
              >
                <Heart
                  className="h-[18px] w-[18px]"
                  fill={isFavorite(currentTrack.id) ? 'currentColor' : 'none'}
                />
              </Button>
            )}

            <div className="hidden items-center gap-1 font-mono text-[10px] tabular-nums text-white/35 lg:flex">
              <span className="w-8 text-right">{formatTime(currentTime)}</span>
              <span aria-hidden="true">/</span>
              <span className="w-8">{formatTime(duration)}</span>
            </div>

            <div className="hidden items-center gap-1 md:flex">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="h-9 w-9 rounded-full text-white/45 hover:bg-white/[0.08] hover:text-white"
                aria-label={
                  isMuted || volume === 0 ? 'Unmute audio' : 'Mute audio'
                }
                aria-pressed={isMuted || volume === 0}
                title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>

              <div className="relative flex h-8 w-20 items-center rounded-full focus-within:ring-2 focus-within:ring-[#6f87ff]/65 lg:w-24">
                <span className="pointer-events-none absolute inset-x-1 h-1 overflow-hidden rounded-full bg-white/15">
                  <span
                    className="block h-full rounded-full bg-white/70"
                    style={{ width: `${volume}%` }}
                  />
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) =>
                    handleVolumeChange([parseInt(e.target.value)])
                  }
                  aria-label="Volume"
                  aria-valuetext={`${volume} percent`}
                  title={`Volume: ${volume}%`}
                  className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowQueue(!showQueue)}
              aria-label={showQueue ? 'Close play queue' : 'Open play queue'}
              aria-expanded={showQueue}
              aria-controls="player-queue"
              title={showQueue ? 'Close queue' : 'Open queue'}
              className={cn(
                'relative h-10 w-10 rounded-full',
                showQueue
                  ? 'bg-[#5f7cff] text-white hover:bg-[#7087ff] hover:text-white'
                  : 'text-white/50 hover:bg-white/[0.08] hover:text-white',
              )}
            >
              <List className="h-[18px] w-[18px]" />
              {queue.length > 0 && (
                <span
                  className={cn(
                    'absolute right-0.5 top-0.5 flex min-h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold leading-none',
                    showQueue
                      ? 'bg-white text-[#405bcc]'
                      : 'bg-[#7087ff] text-white',
                  )}
                  aria-hidden="true"
                >
                  {queue.length > 99 ? '99+' : queue.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersistentPlayer;
