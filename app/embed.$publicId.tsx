import { useEffect, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import {
  ArrowUpRight,
  Disc3,
  Pause,
  Play,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { api } from '@/convex/_generated/api';
import CrateLogo from '@/lib/components/common/Logo';
import { PlayerVideo } from '@/lib/components/public/PlayerVideo';
import { PublicArtworkMosaic } from '@/lib/components/public/PublicArtworkMosaic';
import {
  isPlayable,
  loadPublicPlaylist,
  usePublicPlayback,
  type PublicTrack,
} from '@/lib/components/public/publicPlayback';
import { usePlayerStore } from '@/lib/stores';
import { formatDuration } from '@/lib/utils/format';
import { cn } from '@/lib/utils/tailwind';

interface EmbedSearch {
  autoplay?: 1;
}

export const Route = createFileRoute('/embed/$publicId')({
  // Return `1` rather than `true`: the server redirects when the validated
  // search serializes differently from the request, so `?autoplay=1` must
  // come back as `autoplay=1`.
  validateSearch: ({ autoplay }: Record<string, unknown>): EmbedSearch => ({
    autoplay:
      autoplay === 1 ||
      autoplay === '1' ||
      autoplay === true ||
      autoplay === 'true'
        ? 1
        : undefined,
  }),
  loader: ({ params }) => loadPublicPlaylist(params.publicId),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} · Crate` : 'Crate' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: EmbedPlayer,
});

/**
 * With ?autoplay=1, start once at least half the player is on screen, as
 * YouTube requires. Browsers usually block sound until the listener has
 * interacted, in which case the play button stays up.
 */
function useAutoplayWhenVisible(
  target: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  start: () => void,
) {
  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  });

  useEffect(() => {
    const element = target.current;
    if (!enabled || !element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.5) {
          observer.disconnect();
          startRef.current();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, enabled]);
}

function trackNote(track: PublicTrack) {
  if (track.audio_status === 'pending') return 'Finding audio…';
  if (track.audio_status === 'unavailable') return 'No audio';
  return formatDuration(track.duration);
}

function EmbedPlayer() {
  const { publicId } = Route.useParams();
  const { autoplay } = Route.useSearch();
  const loaded = Route.useLoaderData();
  const live = useQuery(api.playlists.getPublicPlaylist, { publicId });
  const playlist = live === undefined ? loaded : live;
  const playback = usePublicPlayback(playlist, { loop: true });
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const playerRef = useRef<HTMLDivElement>(null);

  useAutoplayWhenVisible(playerRef, Boolean(autoplay), () => {
    void playback.play();
  });

  if (!playlist) {
    return (
      <main className="flex h-dvh items-center justify-center gap-3 bg-[#f5f2eb] px-6 text-center text-sm text-black/55">
        <Disc3 className="h-5 w-5 shrink-0" />
        This playlist is private or no longer shared.
      </main>
    );
  }

  const ownerName =
    playlist.owner?.displayName || playlist.owner?.username || 'A Crate digger';
  const openUrl = `/p/${playlist.publicId}`;
  const nowPlaying = playback.isActive ? currentTrack : null;
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const canPlay = playback.queue.length > 0;

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#f5f2eb] text-[#252621]">
      <section className="flex gap-4 p-4 max-[440px]:flex-col">
        <div ref={playerRef}>
          <PlayerVideo
            showVideo={playback.isActive}
            className="h-[200px] w-[200px] rounded-xl max-[440px]:w-full"
            cover={
              <button
                type="button"
                onClick={() => void playback.play()}
                disabled={!canPlay}
                aria-label={`Play ${playlist.title}`}
                className="group relative h-full w-full"
              >
                <PublicArtworkMosaic
                  artworkUrls={playlist.tracks.map((track) => track.artwork)}
                  coverImageUrl={playlist.coverImageUrl}
                  className="h-full w-full"
                />
                {canPlay && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/25">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#20211f] shadow-lg transition-transform group-hover:scale-105">
                      <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
                    </span>
                  </span>
                )}
              </button>
            }
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <a
            href={openUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/45 transition-colors hover:text-black"
          >
            <CrateLogo className="h-4 w-4" />
            Crate
          </a>
          <h1 className="mt-2 line-clamp-2 text-xl font-semibold leading-tight tracking-[-0.03em]">
            {playlist.title}
          </h1>
          <p className="mt-1 truncate text-xs text-black/50">
            {ownerName} · {playlist.tracks.length}{' '}
            {playlist.tracks.length === 1 ? 'track' : 'tracks'}
          </p>

          <div className="mt-auto pt-3">
            <p className="truncate text-sm font-medium" aria-live="polite">
              {nowPlaying
                ? `${nowPlaying.title} — ${nowPlaying.artist}`
                : canPlay
                  ? 'Press play to listen'
                  : 'Audio for this playlist is still being matched'}
            </p>
            <div
              className="mt-2 h-1 overflow-hidden rounded-full bg-black/10"
              role="progressbar"
              aria-label="Track progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div
                className="h-full rounded-full bg-[#5f63e9] transition-[width] duration-1000 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="mt-3 flex items-center gap-1">
              <button
                type="button"
                onClick={() => void playback.playPrevious()}
                disabled={!playback.isActive}
                aria-label="Previous track"
                className="flex h-9 w-9 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black disabled:opacity-35"
              >
                <SkipBack className="h-4 w-4" fill="currentColor" />
              </button>
              <button
                type="button"
                onClick={() => void playback.play()}
                disabled={!canPlay}
                aria-label={playback.isPlaying ? 'Pause' : 'Play'}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#20211f] text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-35"
              >
                {playback.isPlaying ? (
                  <Pause className="h-4 w-4" fill="currentColor" />
                ) : (
                  <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void playback.playNext()}
                disabled={!playback.isActive}
                aria-label="Next track"
                className="flex h-9 w-9 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black disabled:opacity-35"
              >
                <SkipForward className="h-4 w-4" fill="currentColor" />
              </button>
              <button
                type="button"
                onClick={playback.toggleShuffle}
                disabled={!playback.isActive}
                aria-pressed={playback.isShuffleEnabled}
                aria-label={
                  playback.isShuffleEnabled
                    ? 'Turn shuffle off'
                    : 'Turn shuffle on'
                }
                className={cn(
                  'ml-1 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5 disabled:opacity-35',
                  playback.isShuffleEnabled
                    ? 'text-[#4f54dc]'
                    : 'text-black/45 hover:text-black',
                )}
              >
                <Shuffle className="h-4 w-4" />
              </button>
              <a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex h-9 items-center gap-1 rounded-full px-3 text-xs font-medium text-black/55 transition-colors hover:bg-black/5 hover:text-black"
              >
                Open
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <ol className="min-h-0 flex-1 overflow-y-auto border-t border-black/10 px-2 py-1 [@media(max-height:300px)]:hidden">
        {playlist.tracks.map((track, index) => {
          const playable = isPlayable(track);
          const isCurrent = playback.playingTrackId === track.id;
          return (
            <li key={`${track.id}-${track.playlistPosition}`}>
              <button
                type="button"
                disabled={!playable}
                onClick={() => void playback.play(track.id)}
                className={cn(
                  'grid w-full grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors enabled:hover:bg-black/[0.04]',
                  isCurrent && 'text-[#4f54dc]',
                  !playable && 'opacity-45',
                )}
              >
                <span className="text-center text-xs tabular-nums text-black/40">
                  {isCurrent && playback.isPlaying ? (
                    <Pause
                      className="mx-auto h-3.5 w-3.5 text-[#4f54dc]"
                      fill="currentColor"
                    />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {track.title}
                  </span>
                  <span className="block truncate text-xs text-black/45">
                    {track.artist || 'Unknown artist'}
                  </span>
                </span>
                <span className="text-xs tabular-nums text-black/40">
                  {trackNote(track)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
