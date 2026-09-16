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
      className="grid grid-cols-[auto_1fr_auto] gap-4 p-3 border-2 border-border dark:border-darkBorder rounded-base group items-center hover:bg-border/10"
    >
      <div className="w-8 flex items-center justify-center">
        <Button
          variant="noShadow"
          size="icon"
          className="w-8 h-8"
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
        <div className="font-medium text-text dark:text-darkText">
          {track.title}
        </div>
        {track.extra_artists && (
          <div className="text-sm text-text/60 dark:text-darkText/60">
            {track.extra_artists}
          </div>
        )}
      </div>

      <div className="text-text/60 dark:text-darkText/60">{track.duration}</div>
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
    <div className="space-y-2">
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 p-2 text-sm text-text/60 dark:text-darkText/60">
        <div className="w-8">#</div>
        <div>TITLE</div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>TIME</span>
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
