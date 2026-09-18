import { useState } from 'react';
import { Play, Pause, ChevronUp, ListMusic, Loader2 } from 'lucide-react';
import ReleaseTracks from './ReleaseTracks';
import { useTrackContext } from './TrackDisplay';

const TrackDisplayGrid = () => {
  const {
    result: trackResult,
    isPlaying: trackIsPlaying,
    isLoading: trackIsLoading,
    onPlayToggle: trackOnPlayToggle,
    dateAdded,
  } = useTrackContext();
  const [showTracks, setShowTracks] = useState(false);

  if (!trackResult) return null;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/70 bg-card transition-colors hover:border-border">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {trackResult.cover_image ? (
          <img
            src={trackResult.cover_image}
            alt={trackResult.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <ListMusic className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <button
          type="button"
          onClick={trackOnPlayToggle}
          disabled={trackIsLoading}
          className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-sm transition-transform hover:scale-105 disabled:opacity-80 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
          aria-label={trackIsPlaying ? 'Pause release' : 'Play release'}
        >
          {trackIsLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : trackIsPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" />
          )}
        </button>
        {trackResult.year && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {trackResult.year}
          </span>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
            {trackResult.title}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {trackResult.genre?.slice(0, 2).join(' · ') ||
              trackResult.label?.[0] ||
              'Release'}
          </p>
        </div>

        <div className="flex items-center border-t border-border/60 pt-3">
          <button
            type="button"
            onClick={() => setShowTracks((current) => !current)}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {showTracks ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ListMusic className="h-4 w-4" />
            )}
            {showTracks ? 'Hide tracks' : 'View tracks'}
          </button>
        </div>

        {dateAdded && (
          <p className="text-[11px] text-muted-foreground">
            Added {new Date(dateAdded).toLocaleDateString()}
          </p>
        )}
      </div>

      {showTracks && (
        <div className="border-t border-border/60 bg-background/50 p-3">
          <ReleaseTracks releaseId={trackResult.id} />
        </div>
      )}
    </article>
  );
};

export default TrackDisplayGrid;
