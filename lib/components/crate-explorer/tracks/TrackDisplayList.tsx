import { useState } from 'react';
import {
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Loader2,
  Music,
} from 'lucide-react';
import ReleaseTracks from './ReleaseTracks';
import { useTrackContext } from './TrackDisplay';

const TrackDisplayList = () => {
  const {
    result: trackResult,
    isPlaying: trackIsPlaying,
    isLoading: trackIsLoading,
    onPlayToggle: trackOnPlayToggle,
    dateAdded,
  } = useTrackContext();
  const [showTracks, setShowTracks] = useState(false);

  if (!trackResult) return null;

  const artwork = trackResult.thumb || trackResult.cover_image;

  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="group flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-20 sm:w-20">
          {artwork ? (
            <img
              src={artwork}
              alt={trackResult.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Music className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
          <button
            type="button"
            onClick={trackOnPlayToggle}
            disabled={trackIsLoading}
            className="absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-colors hover:bg-black/55 disabled:opacity-100 sm:bg-black/0 sm:group-hover:bg-black/45"
            aria-label={trackIsPlaying ? 'Pause release' : 'Play release'}
          >
            {trackIsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : trackIsPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 sm:opacity-0 sm:group-hover:opacity-100" />
            )}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
            {trackResult.title}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
            {[trackResult.year, trackResult.country]
              .filter(Boolean)
              .join(' · ') || 'Release'}
          </p>
          <p className="mt-1 hidden truncate text-xs text-muted-foreground sm:block">
            {trackResult.genre?.join(' · ') ||
              trackResult.style?.join(' · ') ||
              trackResult.label?.[0]}
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setShowTracks((current) => !current)}
            className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-3"
            aria-expanded={showTracks}
          >
            <span className="hidden sm:inline">
              {showTracks ? 'Hide tracks' : 'View tracks'}
            </span>
            {showTracks ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {dateAdded && (
        <div className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground sm:hidden">
          Added {new Date(dateAdded).toLocaleDateString()}
        </div>
      )}

      {showTracks && (
        <div className="border-t border-border/60 bg-background/50 p-3 sm:p-4">
          <ReleaseTracks releaseId={trackResult.id} />
        </div>
      )}
    </article>
  );
};

export default TrackDisplayList;
