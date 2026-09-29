import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import {
  ArrowLeft,
  Clock3,
  Disc3,
  Globe2,
  Link2,
  ListMusic,
  Pause,
  Play,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import { PlayerVideo } from '@/lib/components/public/PlayerVideo';
import { PublicArtworkMosaic } from '@/lib/components/public/PublicArtworkMosaic';
import {
  isPlayable,
  loadPublicPlaylist,
  usePublicPlayback,
  type PublicTrack,
} from '@/lib/components/public/publicPlayback';
import { Button } from '@/lib/components/ui/button';
import PersistentPlayer from '@/lib/components/ui/persistent-player';
import { usePlayerStore } from '@/lib/stores';
import { formatDuration } from '@/lib/utils/format';
import { cn } from '@/lib/utils/tailwind';

export const Route = createFileRoute('/p/$publicId')({
  loader: ({ params }) => loadPublicPlaylist(params.publicId),
  head: ({ loaderData: playlist }) => {
    if (!playlist) {
      return {
        meta: [
          { title: 'Listen on Crate' },
          { name: 'robots', content: 'noindex' },
        ],
      };
    }
    const ownerName =
      playlist.owner?.displayName || playlist.owner?.username || 'a digger';
    const description =
      playlist.description ||
      `A set from ${ownerName}'s record collection, shared on Crate.`;
    const image =
      playlist.coverImageUrl ??
      playlist.tracks.find((track) => track.artwork)?.artwork;
    return {
      meta: [
        { title: `${playlist.title} · Crate` },
        { name: 'description', content: description },
        { property: 'og:title', content: playlist.title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'music.playlist' },
        ...(image ? [{ property: 'og:image', content: image }] : []),
        {
          name: 'twitter:card',
          content: image ? 'summary_large_image' : 'summary',
        },
        // Unlisted playlists work by link but stay out of search results.
        ...(playlist.visibility === 'unlisted'
          ? [{ name: 'robots', content: 'noindex' }]
          : []),
      ],
    };
  },
  component: PublicPlaylistPage,
});

function PublicPlaylistPage() {
  const { publicId } = Route.useParams();
  const loaded = Route.useLoaderData();
  const live = useQuery(api.playlists.getPublicPlaylist, { publicId });
  const playlist = live === undefined ? loaded : live;
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const queue = usePlayerStore((state) => state.queue);
  const playback = usePublicPlayback(playlist, { loop: false });
  const tracks = playlist?.tracks ?? [];

  const playTrack = async (track?: PublicTrack) => {
    const didStart = await playback.play(track?.id);
    if (!didStart) toast.error('No playable audio found for this track');
  };

  const sharePlaylist = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: playlist?.title ?? 'Crate playlist',
          text: 'Listen to this set on Crate.',
          url,
        });
        return;
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') return;
      }
    }

    await navigator.clipboard.writeText(url);
    toast.success('Playlist link copied');
  };

  if (!playlist) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f2eb] px-6 text-[#252621]">
        <div className="max-w-md text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#20211f] text-white">
            <Disc3 className="h-6 w-6" />
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em]">
            This set is off the shelf.
          </h1>
          <p className="mt-3 text-sm leading-6 text-black/55">
            It may be private now, or the link may have changed.
          </p>
          <a
            href="/"
            className="mt-7 inline-flex h-11 items-center rounded-full bg-[#20211f] px-5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Visit Crate
          </a>
        </div>
      </main>
    );
  }

  const ownerName =
    playlist.owner?.displayName || playlist.owner?.username || 'A Crate digger';
  const ownerUsername = playlist.owner?.username;
  const artworkUrls = tracks.map((track) => track.artwork);

  return (
    <div className="min-h-screen bg-[#f5f2eb] pb-32 text-[#252621] selection:bg-[#5f63e9] selection:text-white">
      <header className="border-b border-black/10 bg-[#f5f2eb]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-[-0.01em]"
            aria-label="Crate home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#20211f] text-white">
              <Disc3 className="h-4 w-4" />
            </span>
            crate
          </a>
          <div className="flex items-center gap-2">
            {ownerUsername && (
              <a
                href={`/listen/${encodeURIComponent(ownerUsername)}`}
                className="hidden h-9 items-center gap-2 rounded-full px-3 text-xs font-medium text-black/55 transition-colors hover:bg-black/5 hover:text-black sm:inline-flex"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {ownerName}&apos;s shelf
              </a>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 rounded-full border border-black/10 bg-white/55 px-4 text-xs text-[#252621] hover:bg-white"
              onClick={() => void sharePlaylist()}
            >
              <Share2 className="mr-2 h-3.5 w-3.5" /> Share
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-black/10 bg-[radial-gradient(circle_at_85%_15%,rgba(95,99,233,0.13),transparent_32%)]">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 sm:py-14 md:grid-cols-[minmax(15rem,22rem)_1fr] md:items-end md:gap-12 lg:py-20">
            <PlayerVideo
              showVideo={playback.isActive}
              className="aspect-square w-full rounded-[1.75rem] shadow-[0_28px_70px_rgba(31,32,29,0.16)]"
              cover={
                <PublicArtworkMosaic
                  artworkUrls={artworkUrls}
                  coverImageUrl={playlist.coverImageUrl}
                  className="h-full w-full"
                />
              }
            />

            <div className="pb-1">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
                {playlist.visibility === 'unlisted' ? (
                  <>
                    <Link2 className="h-3.5 w-3.5" /> Shared by link
                  </>
                ) : (
                  <>
                    <Globe2 className="h-3.5 w-3.5" /> Public playlist
                  </>
                )}
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                {playlist.title}
              </h1>
              {playlist.description && (
                <p className="mt-5 max-w-2xl text-base leading-7 text-black/58 sm:text-lg">
                  {playlist.description}
                </p>
              )}
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Button
                  type="button"
                  className="h-12 rounded-full bg-[#20211f] px-6 text-white shadow-none hover:bg-black"
                  onClick={() => void playTrack()}
                  disabled={playback.queue.length === 0}
                >
                  {playback.isPlaying ? (
                    <Pause className="mr-2 h-4 w-4" fill="currentColor" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" fill="currentColor" />
                  )}
                  {playback.isPlaying ? 'Pause' : 'Play set'}
                </Button>
                <p className="text-sm text-black/50">
                  Curated by{' '}
                  <span className="font-medium text-black/75">{ownerName}</span>
                  <span className="mx-2">·</span>
                  {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="mb-5 flex items-end justify-between border-b border-black/10 pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                Sequence
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">
                The set
              </h2>
            </div>
            <Clock3 className="h-4 w-4 text-black/35" />
          </div>

          {tracks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 px-6 py-14 text-center">
              <ListMusic className="mx-auto h-6 w-6 text-black/35" />
              <p className="mt-3 text-sm text-black/50">No tracks here yet.</p>
            </div>
          ) : (
            <ol className="divide-y divide-black/[0.075]">
              {tracks.map((track, index) => {
                const isCurrent = playback.playingTrackId === track.id;
                const playable = isPlayable(track);
                const isPlaying = isCurrent && playback.isPlaying;
                return (
                  <li
                    key={`${track.id}-${track.playlistPosition}`}
                    className={cn(
                      'group grid grid-cols-[2.5rem_3rem_minmax(0,1fr)_auto] items-center gap-3 py-3 transition-colors sm:grid-cols-[3rem_3.5rem_minmax(0,1fr)_minmax(9rem,0.4fr)_auto] sm:gap-4 sm:py-3.5',
                      isCurrent && 'text-[#4f54dc]',
                      !playable && 'opacity-45',
                    )}
                  >
                    <button
                      type="button"
                      disabled={!playable}
                      onClick={() => void playTrack(track)}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full text-sm tabular-nums transition-colors',
                        isCurrent
                          ? 'bg-[#5f63e9] text-white'
                          : 'text-black/35 hover:bg-black/[0.06] hover:text-black',
                      )}
                      aria-label={
                        isPlaying
                          ? `Pause ${track.title}`
                          : `Play ${track.title}`
                      }
                    >
                      {isPlaying ? (
                        <Pause className="h-3.5 w-3.5" fill="currentColor" />
                      ) : (
                        <>
                          <span className="group-hover:hidden">
                            {index + 1}
                          </span>
                          <Play
                            className="hidden h-3.5 w-3.5 group-hover:block"
                            fill="currentColor"
                          />
                        </>
                      )}
                    </button>
                    <div className="h-12 w-12 overflow-hidden rounded-xl bg-black/5 sm:h-14 sm:w-14">
                      {track.artwork ? (
                        <img
                          src={track.artwork}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Disc3 className="h-4 w-4 text-black/25" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold tracking-[-0.01em]">
                        {track.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-black/45">
                        {track.artist || 'Unknown artist'}
                      </p>
                    </div>
                    <p className="hidden truncate text-xs text-black/40 sm:block">
                      {[track.genres, track.styles]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                    <span className="text-xs tabular-nums text-black/40">
                      {track.audio_status === 'pending'
                        ? 'Finding audio…'
                        : track.audio_status === 'unavailable'
                          ? 'No audio'
                          : formatDuration(track.duration)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>

      <footer className="border-t border-black/10 px-5 py-8 text-center text-xs text-black/40">
        Shared from a personal record collection with Crate.
      </footer>

      {(currentTrack || queue.length > 0) && (
        <div className="fixed inset-x-0 bottom-0 z-[60]">
          <PersistentPlayer showFavoriteAction={false} />
        </div>
      )}
    </div>
  );
}
