import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { ArrowRight, Disc3, Globe2, Headphones } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { PublicArtworkMosaic } from '@/lib/components/public/PublicArtworkMosaic';

export const Route = createFileRoute('/listen/$username')({
  head: () => ({
    meta: [
      { title: 'Public playlists on Crate' },
      {
        name: 'description',
        content:
          'Listen to public playlists curated from a Discogs collection.',
      },
    ],
  }),
  component: PublicListeningRoom,
});

function PublicListeningRoom() {
  const { username } = Route.useParams();
  const shelf = useQuery(api.playlists.getPublicPlaylistsByUsername, {
    username,
  });

  if (shelf === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f2eb] text-[#252621]">
        <div className="flex items-center gap-3 text-sm text-black/55">
          <Disc3 className="h-5 w-5 animate-spin" />
          Pulling records from the shelf…
        </div>
      </main>
    );
  }

  if (shelf === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f2eb] px-6 text-[#252621]">
        <div className="max-w-md text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#20211f] text-white">
            <Disc3 className="h-6 w-6" />
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em]">
            We couldn&apos;t find this shelf.
          </h1>
          <p className="mt-3 text-sm leading-6 text-black/55">
            Check the address, or head back to Crate.
          </p>
          <a
            href="/"
            className="mt-7 inline-flex h-11 items-center rounded-full bg-[#20211f] px-5 text-sm font-semibold text-white"
          >
            Visit Crate
          </a>
        </div>
      </main>
    );
  }

  const ownerName = shelf.owner.displayName || shelf.owner.username || username;
  const avatarUrl = shelf.owner.avatarUrl;

  return (
    <div className="min-h-screen bg-[#f5f2eb] text-[#252621] selection:bg-[#5f63e9] selection:text-white">
      <header className="border-b border-black/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-[-0.01em]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#20211f] text-white">
              <Disc3 className="h-4 w-4" />
            </span>
            crate
          </a>
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
            <Globe2 className="h-3.5 w-3.5" /> Public shelf
          </span>
        </div>
      </header>

      <main>
        <section className="border-b border-black/10 bg-[radial-gradient(circle_at_85%_15%,rgba(95,99,233,0.13),transparent_34%)]">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover ring-1 ring-black/10"
                    />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#20211f] text-white">
                      <Headphones className="h-5 w-5" />
                    </span>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                      Listening room
                    </p>
                    <p className="mt-1 text-sm text-black/55">
                      @{shelf.owner.username || username}
                    </p>
                  </div>
                </div>
                <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl">
                  Records selected by {ownerName}.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-black/55">
                  Public sets pulled from a personal Discogs collection. Pick a
                  playlist and listen in order.
                </p>
              </div>
              <p className="text-sm tabular-nums text-black/45">
                {shelf.playlists.length}{' '}
                {shelf.playlists.length === 1 ? 'public set' : 'public sets'}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          {shelf.playlists.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-black/15 px-6 py-20 text-center">
              <Disc3 className="mx-auto h-7 w-7 text-black/30" />
              <h2 className="mt-4 text-xl font-semibold tracking-[-0.02em]">
                Nothing is public yet.
              </h2>
              <p className="mt-2 text-sm text-black/50">
                Come back when a set has been placed on the shelf.
              </p>
            </div>
          ) : (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {shelf.playlists.map((playlist) => (
                <a
                  key={playlist.publicId}
                  href={`/p/${encodeURIComponent(playlist.publicId)}`}
                  className="group block"
                >
                  <PublicArtworkMosaic
                    artworkUrls={playlist.artworkUrls}
                    coverImageUrl={playlist.coverImageUrl}
                    className="aspect-square w-full rounded-[1.5rem] shadow-[0_20px_55px_rgba(31,32,29,0.1)] transition-transform duration-500 group-hover:-translate-y-1"
                  />
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold tracking-[-0.025em]">
                        {playlist.title}
                      </h2>
                      <p className="mt-1 text-xs text-black/45">
                        {playlist.trackCount}{' '}
                        {playlist.trackCount === 1 ? 'track' : 'tracks'}
                      </p>
                      {playlist.description && (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-black/52">
                          {playlist.description}
                        </p>
                      )}
                    </div>
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 transition-colors group-hover:bg-[#20211f] group-hover:text-white">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-black/10 px-5 py-8 text-center text-xs text-black/40">
        Curated from Discogs. Played with Crate.
      </footer>
    </div>
  );
}
