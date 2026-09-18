import { Clock, Play, Pause } from 'lucide-react';
import { Button } from '@/lib/components/ui/button';
import { CrateTrack } from '@/lib/types';

interface TrackListProps {
  tracks: CrateTrack[];
  playingTrackId: string | null;
  onPlayToggle: (track: CrateTrack) => void;
  isPlayerReady: boolean;
}

const TrackListItem = ({
  track,
  isPlaying,
  onPlayToggle,
  isPlayerReady,
}: {
  track: CrateTrack;
  isPlaying: boolean;
  onPlayToggle: () => void;
  isPlayerReady: boolean;
}) => {
  return (
    <div
      key={track.position}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/70 sm:px-3"
    >
      <div className="flex w-9 items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={onPlayToggle}
          disabled={!track.youtube_video_id || !isPlayerReady}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div>
        <div className="text-sm font-medium text-foreground">{track.title}</div>
        {track.extra_artists && (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {track.extra_artists}
          </div>
        )}
      </div>

      <div className="text-xs tabular-nums text-muted-foreground">
        {track.duration || '—'}
      </div>
    </div>
  );
};

export function TrackList({
  tracks,
  playingTrackId,
  onPlayToggle,
  isPlayerReady,
}: TrackListProps) {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <div className="w-9 text-center">#</div>
        <div>Title</div>
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>Time</span>
        </div>
      </div>

      {tracks.map((track) => (
        <TrackListItem
          key={track.position}
          track={track}
          isPlaying={playingTrackId === track.position}
          onPlayToggle={() => onPlayToggle(track)}
          isPlayerReady={isPlayerReady}
        />
      ))}
    </div>
  );
}
