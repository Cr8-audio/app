import { useEffect, useRef, type ReactNode } from 'react';
import { setPlayerVideoHost } from '@/lib/stores/musicPlayerStore';
import { cn } from '@/lib/utils/tailwind';

/**
 * Where the YouTube player renders on public pages and embeds. YouTube's
 * developer policies don't allow playing from a hidden player and require at
 * least 200×200 pixels, so the box enforces that size. `cover` (the artwork)
 * sits on top until something plays.
 */
export function PlayerVideo({
  showVideo,
  cover,
  className,
}: {
  showVideo: boolean;
  cover: ReactNode;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPlayerVideoHost(hostRef.current);
    return () => setPlayerVideoHost(null);
  }, []);

  return (
    <div
      className={cn(
        'relative min-h-[200px] min-w-[200px] overflow-hidden',
        showVideo ? 'bg-black' : 'bg-black/5',
        className,
      )}
    >
      <div ref={hostRef} className="absolute inset-0" />
      {!showVideo && <div className="absolute inset-0">{cover}</div>}
    </div>
  );
}
