import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from 'convex/react';
import { Check, LockKeyhole } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import SignInButton from '@/lib/components/signIn';
import { LoadingSpinner } from '@/lib/components/ui/loading';
import CrateLogo from '@/lib/components/common/Logo';

export const Route = createFileRoute('/auth/')({
  component: AuthPage,
});

function AuthPage() {
  return (
    <>
      <AuthLoading>
        <AuthTransition />
      </AuthLoading>

      <Authenticated>
        <AuthenticatedRedirect />
      </Authenticated>

      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
    </>
  );
}

function AuthTransition() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card shadow-sm">
        <LoadingSpinner className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">Opening your Crate…</p>
    </div>
  );
}

function AuthenticatedRedirect() {
  const user = useQuery(api.users.getCurrentUser);

  if (!user) return <AuthTransition />;

  if (!user.username) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to="/analyze/chat" replace />;
}

const benefits = [
  'Start with the records already in your Discogs collection',
  'Search, shortlist, and build playlists from what you own',
  'Ask a DJ assistant for the next track or a new direction',
];

function SignInForm() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 py-6 text-foreground sm:px-8 lg:px-10">
      <div
        className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back to Crate home"
        >
          <CrateLogo className="h-9 w-9" />
          <span className="text-lg font-semibold tracking-[-0.04em]">
            Crate
          </span>
        </Link>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1fr_28rem] lg:gap-20">
          <section className="max-w-2xl" aria-labelledby="auth-intro-title">
            <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-px w-8 bg-primary" />
              Your shelves are the starting point
            </p>
            <h1
              id="auth-intro-title"
              className="max-w-xl text-5xl font-medium leading-[0.96] tracking-[-0.055em] sm:text-6xl"
            >
              One connection. Your whole collection, ready to dig.
            </h1>
            <ul className="mt-8 hidden gap-4 text-sm leading-6 text-muted-foreground sm:grid sm:text-base">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex max-w-xl items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="rounded-[1.5rem] border border-border bg-card p-6 shadow-xl sm:p-8"
            aria-labelledby="sign-in-title"
          >
            <div className="mb-8 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Discogs-first sign in
            </p>
            <h2
              id="sign-in-title"
              className="mt-3 text-3xl font-medium tracking-[-0.04em]"
            >
              Bring your crate in.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Continue with Discogs to create your Crate account or return to
              your collection. You’ll approve access on Discogs, then come
              straight back here.
            </p>
            <div className="mt-7">
              <SignInButton />
            </div>
            <div className="mt-2 flex items-start gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
              <LockKeyhole
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <p>
                Crate uses Discogs authorization. Your Discogs password stays
                with Discogs.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
