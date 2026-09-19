import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from 'convex/react';
import { api } from '@/convex/_generated/api';
import SignInButton from '@/lib/components/signIn';
import { LoadingSpinner } from '@/lib/components/ui/loading';
import CrateLogo from '@/lib/components/common/Logo';

const HomeClient = () => {
  return (
    <>
      <AuthLoading>
        <PageLoading />
      </AuthLoading>

      <Authenticated>
        <AuthenticatedRedirect />
      </Authenticated>

      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
    </>
  );
};

function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoadingSpinner className="h-5 w-5" />
      <span className="sr-only">Loading Crate</span>
    </div>
  );
}

function AuthenticatedRedirect() {
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (!user) return;

    if (!user.username) {
      navigate({ to: '/onboarding', replace: true });
      return;
    }

    navigate({ to: '/analyze/chat', replace: true });
  }, [user, navigate]);

  return <PageLoading />;
}

const collectionSteps = [
  {
    number: '01',
    title: 'Bring what you own',
    description: 'Your Discogs collection becomes your starting point.',
  },
  {
    number: '02',
    title: 'Dig with intent',
    description: 'Search your shelves or ask the DJ assistant for a direction.',
  },
  {
    number: '03',
    title: 'Shape the set',
    description:
      'Collect the right tracks into playlists you can actually play.',
  },
];

function RecordRoomArtwork() {
  return (
    <div
      className="relative mx-auto aspect-[4/5] w-full max-w-[25rem]"
      aria-hidden="true"
    >
      <div className="absolute inset-x-10 bottom-6 top-16 rotate-3 rounded-[2rem] border border-border bg-muted shadow-lg" />

      <div className="absolute left-0 top-2 h-[72%] w-[76%] -rotate-3 overflow-hidden rounded-[1.75rem] border border-border bg-card p-7 shadow-xl sm:p-9">
        <div className="flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <span>Crate select</span>
          <span>001</span>
        </div>
        <div className="mt-14">
          <div className="mb-5 h-px w-16 bg-primary" />
          <p className="max-w-[10rem] text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl">
            Your records, ready.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Pulled from your shelves
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 right-0 aspect-square w-[70%] rounded-[1.75rem] border border-border bg-card p-[9%] shadow-xl">
        <div className="relative h-full w-full rounded-full bg-foreground shadow-lg motion-safe:animate-[spin_28s_linear_infinite] motion-reduce:animate-none">
          <div className="absolute inset-[9%] rounded-full border border-background/10" />
          <div className="absolute inset-[18%] rounded-full border border-background/10" />
          <div className="absolute inset-[27%] rounded-full border border-background/10" />
          <div className="absolute inset-[36%] grid place-items-center rounded-full bg-primary text-primary-foreground">
            <span className="text-xs font-semibold tracking-[-0.08em]">CR</span>
          </div>
          <div className="absolute inset-[48%] rounded-full bg-card" />
          <div className="absolute left-[18%] top-[14%] h-[32%] w-[9%] rotate-[-24deg] rounded-full bg-background/10 blur-sm" />
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <a
          href="#top"
          className="group inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Crate home"
        >
          <CrateLogo className="h-9 w-9 transition-transform duration-300 group-hover:rotate-6" />
          <span className="text-lg font-semibold tracking-[-0.04em]">
            Crate
          </span>
        </a>
        <p className="hidden text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground sm:block">
          A record room for your Discogs collection
        </p>
      </header>

      <main id="top" className="relative z-10">
        <section className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pb-16 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-20 lg:px-10 lg:pb-20 lg:pt-12">
          <div className="max-w-2xl">
            <p className="mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-px w-8 bg-primary" />
              Your collection, in motion
            </p>
            <h1 className="text-[clamp(3.25rem,6.5vw,5.5rem)] font-medium leading-[0.91] tracking-[-0.06em] text-foreground">
              Turn what you own into what you play.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Connect Discogs and Crate turns your collection into a living
              workspace—ready to search, shape into playlists, and explore with
              a DJ assistant.
            </p>

            <div className="mt-9 max-w-sm">
              <SignInButton className="h-13 rounded-xl px-5 text-[0.95rem] shadow-sm" />
              <p className="mt-3 text-center text-xs leading-5 text-muted-foreground sm:text-left">
                Your Discogs account is your sign-in. No collection import to
                manage by hand.
              </p>
            </div>
          </div>

          <RecordRoomArtwork />
        </section>

        <section
          className="mx-auto w-full max-w-7xl border-t border-border px-5 py-8 sm:px-8 lg:px-10 lg:py-10"
          aria-label="How Crate works"
        >
          <ol className="grid gap-8 md:grid-cols-3 md:gap-10">
            {collectionSteps.map((step) => (
              <li key={step.number} className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="pt-0.5 font-mono text-[0.65rem] text-primary">
                  {step.number}
                </span>
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">
                    {step.title}
                  </h2>
                  <p className="mt-1.5 max-w-xs text-sm leading-6 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}

export default HomeClient;
