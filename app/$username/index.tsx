import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { Image } from '@unpic/react';
import {
  ArrowRight,
  Disc3,
  Heart,
  LibraryBig,
  ListMusic,
  Music2,
  Pause,
  Play,
  Send,
  Sparkles,
} from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { usePlayerStore } from '@/lib/stores';
import { CrateTrack } from '@/lib/types';
import { Button } from '@/lib/components/ui/button';
import { LoadingSpinner } from '@/lib/components/ui/loading';
import { cn } from '@/lib/utils/tailwind';
import { toast } from 'sonner';

export const Route = createFileRoute('/$username/')({
  component: UserOverviewPage,
});

function CollectionArtwork({ tracks }: { tracks: CrateTrack[] }) {
  const artworks = tracks.filter((track) => track.artwork).slice(0, 4);

  return (
    <div className="relative mx-auto h-[15rem] w-[15rem] sm:h-[18rem] sm:w-[18rem]">
      <div className="absolute inset-[12%] rounded-full bg-foreground shadow-float">
        <div className="absolute inset-[14%] rounded-full border border-white/10" />
        <div className="absolute inset-[28%] rounded-full border border-white/10" />
        <div className="absolute inset-[44%] rounded-full bg-primary" />
      </div>
      {artworks.map((track, index) => {
        const positions = [
          '-left-1 top-2 rotate-[-7deg]',
          '-right-2 top-5 rotate-[8deg]',
          'bottom-0 left-6 rotate-[4deg]',
          'bottom-2 right-5 rotate-[-5deg]',
        ];
        return (
          <div
            key={track.id}
            className={cn(
              'absolute h-[42%] w-[42%] overflow-hidden rounded-[1.05rem] border-[5px] border-card bg-muted shadow-float',
              positions[index],
            )}
          >
            <Image
              src={track.artwork!}
              alt=""
              width={140}
              height={140}
              className="h-full w-full object-cover"
            />
          </div>
        );
      })}
      {artworks.length === 0 && (
        <div className="absolute inset-[23%] flex items-center justify-center rounded-[1.4rem] bg-primary text-primary-foreground shadow-float rotate-[-4deg]">
          <Disc3 className="h-12 w-12" strokeWidth={1.4} />
        </div>
      )}
    </div>
  );
}

function TrackCard({
  track,
  isPlaying,
  onPlay,
}: {
  track: CrateTrack;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  return (
    <article className="group min-w-0">
      <div className="relative aspect-square overflow-hidden rounded-[1.1rem] bg-muted shadow-soft">
        {track.artwork ? (
          <Image
            src={track.artwork}
            alt={`${track.title} artwork`}
            width={300}
            height={300}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <Music2 className="h-8 w-8" strokeWidth={1.4} />
          </div>
        )}
        <button
          type="button"
          onClick={onPlay}
          className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105 active:scale-95 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0 sm:focus-visible:opacity-100"
          aria-label={`${isPlaying ? 'Pause' : 'Play'} ${track.title}`}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
          )}
        </button>
      </div>
      <h3 className="mt-3 truncate text-sm font-semibold text-foreground">
        {track.title}
      </h3>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {track.artist}
      </p>
    </article>
  );
}

function OverviewContent({ username }: { username: string }) {
  const navigate = useNavigate();
  const { displayName } = useAuth();
  const convexTracks = useQuery(api.tracks.getUserTracks);
  const playlists = useQuery(api.playlists.getUserPlaylists);
  const { getFavoriteTracksFromAllTracks } = useFavorites();
  const {
    initializePlayer,
    isPlaying,
    playingTrackId,
    setQueue,
    togglePlayPause,
  } = usePlayerStore();
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  const tracks = useMemo(
    () =>
      (convexTracks ?? []).map((track) => ({
        ...track,
        id: track.id || track._id,
      })) as CrateTrack[],
    [convexTracks],
  );

  const favoriteTracks = getFavoriteTracksFromAllTracks(tracks);
  const rotation = (favoriteTracks.length ? favoriteTracks : tracks).slice(
    0,
    6,
  );
  const artistCount = new Set(tracks.map((track) => track.artist)).size;
  const genres = tracks.flatMap((track) =>
    Array.isArray(track.genres)
      ? track.genres
      : typeof track.genres === 'string'
        ? track.genres.split(',').map((genre) => genre.trim())
        : [],
  );
  const leadingGenre = genres.find(Boolean);
  const bpms = tracks
    .map((track) => track.bpm)
    .filter((bpm): bpm is number => typeof bpm === 'number');
  const middleBpm = bpms.length
    ? Math.round(bpms.reduce((sum, bpm) => sum + bpm, 0) / bpms.length)
    : 124;
  const suggestedPrompts = [
    leadingGenre
      ? `Build a warm-up set from my ${leadingGenre} records`
      : 'Build a warm-up set from my collection',
    `Find a smooth run around ${middleBpm} BPM`,
    'Give me a left-field transition I would not pick myself',
  ];

  if (convexTracks === undefined || playlists === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const startAsk = (value: string) => {
    const nextPrompt = value.trim();
    navigate({
      to: '/analyze/chat',
      search: nextPrompt ? { prompt: nextPrompt } : {},
    });
  };

  const playTrack = async (track: CrateTrack) => {
    const index = rotation.findIndex((candidate) => candidate.id === track.id);
    setQueue(rotation, Math.max(0, index));
    const didStart = await togglePlayPause(track);
    if (!didStart) {
      toast.error('No playable audio was found for this track.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[88rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card px-5 py-7 shadow-soft sm:px-8 sm:py-10 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-center lg:gap-10 lg:px-12 lg:py-12">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Grounded in {tracks.length.toLocaleString()} tracks</span>
          </div>
          <h2 className="max-w-xl text-[2.25rem] font-semibold leading-[1.03] tracking-[-0.055em] text-foreground sm:text-5xl lg:text-[3.5rem]">
            What should we pull from the crate?
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Welcome back, {displayName || username}. Describe the room, the
            energy, or the transition. Crate will work from music you actually
            own.
          </p>

          <form
            className="mt-7 flex items-center gap-2 rounded-[1rem] border border-border bg-popover p-2 shadow-soft focus-within:border-primary"
            onSubmit={(event) => {
              event.preventDefault();
              startAsk(prompt);
            }}
          >
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Try “late-night house, 118–124 BPM”"
              className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              aria-label="Ask your crate"
            />
            <Button type="submit" size="icon" aria-label="Open Ask Crate">
              <Send className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedPrompts.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => startAsk(suggestion)}
                className="rounded-full border border-border/80 bg-background/65 px-3 py-1.5 text-left text-[0.7rem] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-accent-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 lg:mt-0">
          <CollectionArtwork tracks={tracks} />
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            label: 'Playable tracks',
            value: tracks.length,
            icon: LibraryBig,
          },
          { label: 'Artists', value: artistCount, icon: Music2 },
          {
            label: 'Saved playlists',
            value: playlists.length,
            icon: ListMusic,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-[1rem] border border-border/65 bg-card/65 px-4 py-3.5"
            >
              <Icon
                className="h-4 w-4 text-muted-foreground"
                strokeWidth={1.7}
              />
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {stat.value.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                {stat.label}
              </span>
            </div>
          );
        })}
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">
              {favoriteTracks.length ? 'Saved for later' : 'From your shelves'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-foreground">
              {favoriteTracks.length
                ? 'Back in rotation'
                : 'Start somewhere good'}
            </h2>
          </div>
          <Link
            to="/$username/tracks"
            params={{ username }}
            className="hidden items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:flex"
          >
            Open library <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {rotation.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-6">
            {rotation.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                isPlaying={playingTrackId === track.id && isPlaying}
                onPlay={() => void playTrack(track)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-start rounded-[1.25rem] border border-dashed border-border bg-card/50 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Disc3 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Your collection is getting ready
                </h3>
                <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">
                  New Discogs releases will appear here as they finish syncing.
                  You can explore the catalog in the meantime.
                </p>
              </div>
            </div>
            <Link
              to="/$username/collection"
              params={{ username }}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary sm:mt-0"
            >
              Browse Discogs <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </section>

      <section className="mt-12 grid gap-4 pb-6 lg:grid-cols-2">
        <Link
          to="/$username/tracks"
          params={{ username }}
          className="group flex items-center justify-between rounded-[1.25rem] border border-border/70 bg-card p-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-soft"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <LibraryBig className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Your library
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Filter tracks by artist, genre, and BPM.
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          to="/$username/playlists"
          params={{ username }}
          className="group flex items-center justify-between rounded-[1.25rem] border border-border/70 bg-card p-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-soft"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground">
              <Heart className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Your playlists
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Turn good finds into a set you can return to.
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
      </section>
    </div>
  );
}

function UserOverviewPage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (user === null) navigate({ to: '/', replace: true });
  }, [navigate, user]);

  if (user === undefined || user === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <OverviewContent username={username} />;
}
