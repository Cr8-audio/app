import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '@/lib/stores';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { nextPosition } from '@/lib/player/playOrder';
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

/** The queue lists this many upcoming tracks and counts the rest. */
const MAX_UPCOMING_SHOWN = 50;

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// The native range input handles pointer and keyboard; it sits invisible on
// top of the drawn track, with a hairline thumb so a click lands where it
// points.
const RANGE_INPUT_CLASS =
  'absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 disabled:cursor-default [&::-moz-range-thumb]:w-px [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:w-px [&::-webkit-slider-thumb]:appearance-none';

function SliderTrack({ percent }: { percent: number }) {
  return (
    <>
      <span className="pointer-events-none absolute inset-x-0 h-1 overflow-hidden rounded-full bg-white/15">
        <span
          className="block h-full rounded-full bg-white/75 group-hover:bg-[#7087ff] group-has-[:focus-visible]:bg-[#7087ff]"
          style={{ width: `${percent}%` }}
        />
      </span>
      <span
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full bg-white opacity-0 shadow-[0_1px_4px_rgba(0,0,0,0.45)] group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
        style={{ left: `${percent}%` }}
      />
    </>
  );
}

function SeekBar({ className }: { className?: string }) {
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const listedDuration = usePlayerStore(
    (state) => state.currentTrack?.duration,
  );

  // Dragging shows where the pointer is and seeks on release; seeking on
  // every step makes the audio stutter. Keyboard steps seek right away.
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const dragged = useRef<number | null>(null);
  const isDragging = useRef(false);

  const release = () => {
    isDragging.current = false;
    if (dragged.current !== null) seekTo(dragged.current);
    dragged.current = null;
    setScrubTime(null);
  };

  const shownTime = Math.min(scrubTime ?? currentTime, duration || Infinity);
  const percent = duration > 0 ? (shownTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        'flex items-center gap-2 font-mono text-[11px] tabular-nums text-white/50',
        className,
      )}
    >
      <span className="w-9 text-right">{formatTime(shownTime)}</span>
      <div className="group relative flex h-4 min-w-0 flex-1 items-center rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#6f87ff]/65 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[#20211f]">
        <SliderTrack percent={percent} />
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="1"
          value={Math.floor(shownTime)}
          disabled={!duration}
          onPointerDown={(event) => {
            isDragging.current = true;
            // Keep receiving the pointer when it's let go off the bar.
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onChange={(event) => {
            const time = Number(event.target.value);
            if (isDragging.current) {
              dragged.current = time;
              setScrubTime(time);
            } else {
              seekTo(time);
            }
          }}
          onPointerUp={release}
          onPointerCancel={release}
          aria-label="Seek through track"
          aria-valuetext={`${formatTime(shownTime)} of ${formatTime(duration)}`}
          className={RANGE_INPUT_CLASS}
        />
      </div>
      <span className="w-9">
        {duration > 0 ? formatTime(duration) : listedDuration || '0:00'}
      </span>
    </div>
  );
}

function QueueRow({
  track,
  isCurrent = false,
  isPlaying = false,
  onPlay,
  onRemove,
}: {
  track: CrateTrack;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onPlay: () => void;
  onRemove?: () => void;
}) {
  return (
    <li
      className={cn(
        'group grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-1 rounded-xl border border-transparent transition-colors',
        isCurrent ? 'border-[#5f7cff]/25 bg-white/75' : 'hover:bg-white/55',
      )}
    >
      <button
        type="button"
        className="flex min-w-0 items-center gap-3 rounded-xl p-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#5f7cff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f0e7] sm:p-3"
        onClick={onPlay}
        aria-current={isCurrent ? 'true' : undefined}
        aria-label={
          isCurrent && isPlaying
            ? `Pause ${track.title} by ${track.artist}`
            : `Play ${track.title} by ${track.artist}`
        }
        title={`${track.title} — ${track.artist}`}
      >
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
            isCurrent
              ? 'bg-[#5f7cff] text-white'
              : 'bg-black/[0.055] text-black/55 group-hover:bg-black/[0.085]',
          )}
          aria-hidden="true"
        >
          {isCurrent && isPlaying ? (
            <Pause className="h-3.5 w-3.5" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />
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
              isCurrent ? 'text-[#405bcc]' : 'text-black/80',
            )}
          >
            {track.title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-black/45">
            {track.artist}
          </span>
        </span>

        {track.duration && track.duration !== '0:00' && (
          <span className="hidden shrink-0 font-mono text-[11px] tabular-nums text-black/35 sm:block">
            {track.duration}
          </span>
        )}
      </button>

      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="mr-1 h-9 w-9 rounded-full text-black/35 hover:bg-black/[0.06] hover:text-black/70"
          aria-label={`Remove ${track.title} from queue`}
          title="Remove from queue"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </li>
  );
}

function QueueHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="px-1 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
      {children}
    </h4>
  );
}

const PersistentPlayer = ({
  showFavoriteAction = true,
}: PersistentPlayerProps) => {
  // Everything but the clock, so the bar doesn't re-render every second.
  const {
    currentTrack,
    isPlaying,
    isShuffleEnabled,
    isRepeatEnabled,
    queue,
    upNext,
    playOrder,
    orderPosition,
    playbackIssue,
    volume,
    playTrack,
    playNext,
    playPrevious,
    playUpNext,
    togglePlayPause,
    toggleShuffle,
    toggleRepeat,
    setVolume,
    removeFromQueue,
    removeFromUpNext,
    clearUpNext,
  } = usePlayerStore(
    useShallow((state) => ({
      currentTrack: state.currentTrack,
      isPlaying: state.isPlaying,
      isShuffleEnabled: state.isShuffleEnabled,
      isRepeatEnabled: state.isRepeatEnabled,
      queue: state.queue,
      upNext: state.upNext,
      playOrder: state.playOrder,
      orderPosition: state.orderPosition,
      playbackIssue: state.playbackIssue,
      volume: state.volume,
      playTrack: state.playTrack,
      playNext: state.playNext,
      playPrevious: state.playPrevious,
      playUpNext: state.playUpNext,
      togglePlayPause: state.togglePlayPause,
      toggleShuffle: state.toggleShuffle,
      toggleRepeat: state.toggleRepeat,
      setVolume: state.setVolume,
      removeFromQueue: state.removeFromQueue,
      removeFromUpNext: state.removeFromUpNext,
      clearUpNext: state.clearUpNext,
    })),
  );

  const [showQueue, setShowQueue] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);

  const { toggleFavorite, isFavorite } = useFavorites();

  // "Next" can come up empty without the listener touching anything (the
  // track ended), so say why here rather than at each button.
  useEffect(() => {
    if (!playbackIssue) return;
    toast.error(
      playbackIssue.reason === 'unavailable'
        ? 'Audio search is unavailable right now. Try again in a minute.'
        : 'No audio was found for the next tracks',
    );
  }, [playbackIssue]);

  const handleVolumeChange = (newVolume: number) => {
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

  const playFromQueue = async (play: () => Promise<boolean>) => {
    if (!(await play())) toast.error('No playable audio found for this track');
  };

  const primaryGenre = currentTrack?.genres?.split(',')[0]?.trim();

  // What follows the current track: the listener's own queue first, then the
  // rest of the list being played, in play order.
  const upcomingIndices = playOrder.slice(orderPosition + 1);
  const upcoming = upcomingIndices
    .slice(0, MAX_UPCOMING_SHOWN)
    .flatMap((index) => (queue[index] ? [queue[index]] : []));
  const upcomingHidden = upcomingIndices.length - upcoming.length;
  const canPlayNext =
    upNext.length > 0 ||
    nextPosition(
      { order: playOrder, position: orderPosition },
      isRepeatEnabled,
    ) !== null;

  // Don't show player if no track is playing or in queue
  if (!currentTrack && queue.length === 0 && upNext.length === 0) {
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
            <div className="sticky top-0 z-10 -mx-3 flex items-center justify-between border-b border-black/8 bg-[#f4f0e7]/95 px-3 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 sm:py-4">
              <h3 className="text-base font-semibold tracking-[-0.01em] sm:text-lg">
                Queue
              </h3>
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

            {currentTrack && (
              <section aria-label="Now playing">
                <QueueHeading>Now playing</QueueHeading>
                <ul>
                  <QueueRow
                    track={currentTrack}
                    isCurrent
                    isPlaying={isPlaying}
                    onPlay={() => void togglePlayPause(currentTrack)}
                  />
                </ul>
              </section>
            )}

            {upNext.length > 0 && (
              <section aria-label="Next in queue">
                <div className="flex items-end justify-between">
                  <QueueHeading>Next in queue</QueueHeading>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearUpNext}
                    className="mb-1 h-7 rounded-full px-2.5 text-[11px] font-semibold text-black/55 hover:bg-black/[0.07] hover:text-black"
                  >
                    Clear queue
                  </Button>
                </div>
                <ul className="space-y-1.5">
                  {upNext.map((track) => (
                    <QueueRow
                      key={track.id}
                      track={track}
                      onPlay={() =>
                        void playFromQueue(() => playUpNext(track.id))
                      }
                      onRemove={() => removeFromUpNext(track.id)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {upcoming.length > 0 && (
              <section aria-label="Next up">
                <QueueHeading>Next up</QueueHeading>
                <ul className="space-y-1.5">
                  {upcoming.map((track) => (
                    <QueueRow
                      key={track.id}
                      track={track}
                      onPlay={() => void playFromQueue(() => playTrack(track))}
                      onRemove={() => removeFromQueue(track.id)}
                    />
                  ))}
                </ul>
                {upcomingHidden > 0 && (
                  <p className="px-1 pt-3 text-xs text-black/45">
                    and {upcomingHidden.toLocaleString('en-US')} more
                  </p>
                )}
              </section>
            )}

            {upNext.length === 0 && upcoming.length === 0 && (
              <p className="px-1 pt-4 text-sm text-black/50">
                {isRepeatEnabled && queue.length > 0
                  ? 'The list starts over after this track.'
                  : 'Nothing is queued after this track.'}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-[96rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-3 pb-2.5 pt-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,3fr)] sm:gap-x-5 sm:px-5 sm:py-2.5 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {currentTrack?.artwork ? (
            <Image
              src={currentTrack.artwork}
              alt={`${currentTrack.title} artwork`}
              width={56}
              height={56}
              className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-white/10 sm:h-14 sm:w-14"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-white/35 ring-1 ring-white/10 sm:h-14 sm:w-14">
              <Music className="h-5 w-5" />
            </div>
          )}

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-[-0.01em] text-[#f6f2e9]">
              {currentTrack?.title || 'Nothing playing'}
            </div>
            <div className="mt-0.5 truncate text-xs text-white/45">
              {currentTrack
                ? currentTrack.artist
                : 'Press play to start the queue'}
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

        <div className="col-span-2 row-start-2 flex min-w-0 flex-col-reverse items-center gap-1 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:flex-col">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
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
                'h-8 w-8 rounded-full',
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
              onClick={() => void playPrevious()}
              disabled={!currentTrack}
              className="h-9 w-9 rounded-full text-white/70 hover:bg-white/[0.08] hover:text-white"
              aria-label="Play previous track"
              title="Previous track"
            >
              <SkipBack className="h-[18px] w-[18px]" fill="currentColor" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                void (currentTrack ? togglePlayPause(currentTrack) : playNext())
              }
              disabled={!currentTrack && !canPlayNext}
              className="h-10 w-10 rounded-full bg-[#f6f2e9] text-[#20211f] shadow-[0_5px_18px_rgba(0,0,0,0.2)] hover:scale-[1.04] hover:bg-white hover:text-black active:scale-[0.98]"
              aria-label={
                isPlaying ? 'Pause current track' : 'Play current track'
              }
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-[18px] w-[18px]" fill="currentColor" />
              ) : (
                <Play
                  className="ml-0.5 h-[18px] w-[18px]"
                  fill="currentColor"
                />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void playNext()}
              disabled={!canPlayNext}
              className="h-9 w-9 rounded-full text-white/70 hover:bg-white/[0.08] hover:text-white"
              aria-label="Play next track"
              title={canPlayNext ? 'Next track' : 'Nothing queued after this'}
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
                'h-8 w-8 rounded-full',
                isRepeatEnabled
                  ? 'bg-[#5f7cff] text-white hover:bg-[#7087ff] hover:text-white'
                  : 'text-white/45 hover:bg-white/[0.08] hover:text-white',
              )}
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>

          <SeekBar className="w-full max-w-[40rem]" />
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
            {upNext.length > 0 && (
              <span
                className={cn(
                  'absolute right-0.5 top-0.5 flex min-h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold leading-none',
                  showQueue
                    ? 'bg-white text-[#405bcc]'
                    : 'bg-[#7087ff] text-white',
                )}
                aria-hidden="true"
              >
                {upNext.length > 99 ? '99+' : upNext.length}
              </span>
            )}
          </Button>

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

            <div className="group relative flex h-4 w-20 items-center rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#6f87ff]/65 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[#20211f] lg:w-24">
              <SliderTrack percent={volume} />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                aria-label="Volume"
                aria-valuetext={`${volume} percent`}
                title={`Volume: ${volume}%`}
                className={RANGE_INPUT_CLASS}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersistentPlayer;
