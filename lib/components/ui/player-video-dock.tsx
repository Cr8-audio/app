import { X } from 'lucide-react';
import { PlayerVideo } from '@/lib/components/public/PlayerVideo';
import { usePlayerStore } from '@/lib/stores';
import { cn } from '@/lib/utils/tailwind';

/**
 * The in-app YouTube player, docked above the player bar. YouTube's policies
 * don't allow playing from a hidden player, so the video shows whenever a
 * track is loaded, and closing it stops playback. It stays mounted (just
 * invisible) with nothing loaded, so the player isn't rebuilt on every play.
 */
export function PlayerVideoDock() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const clearQueue = usePlayerStore((state) => state.clearQueue);
  const isVisible = currentTrack !== null;

  return (
    <div
      aria-hidden={!isVisible}
      className={cn(
        // Clear the mobile nav, which sits between the page and the player.
        'absolute bottom-full right-3 mb-[5.1rem] overflow-hidden rounded-xl bg-black shadow-[0_18px_50px_rgba(0,0,0,0.35)] ring-1 ring-white/10 md:mb-3',
        'transition-[opacity,transform] duration-200 ease-out',
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none invisible translate-y-2 opacity-0',
      )}
    >
      <PlayerVideo
        showVideo
        cover={null}
        className="h-[200px] w-[200px] sm:w-[356px]"
      />
      <button
        type="button"
        onClick={clearQueue}
        aria-label="Stop and close the video"
        title="Stop and close"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
