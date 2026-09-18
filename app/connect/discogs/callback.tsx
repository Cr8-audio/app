import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useAction, useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/lib/components/ui/button';
import {
  DISCOGS_RETURN_KEY,
  DISCOGS_SIGN_IN_NONCE_KEY,
} from '@/lib/hooks/useDiscogsConnection';
import { toast } from 'sonner';

interface CallbackSearch {
  oauth_token?: string;
  oauth_verifier?: string;
  denied?: string;
}

export const Route = createFileRoute('/connect/discogs/callback')({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    oauth_token:
      typeof search.oauth_token === 'string' ? search.oauth_token : undefined,
    oauth_verifier:
      typeof search.oauth_verifier === 'string'
        ? search.oauth_verifier
        : undefined,
    denied: typeof search.denied === 'string' ? search.denied : undefined,
  }),
  component: DiscogsCallbackPage,
});

function takeReturnPath(): string | null {
  try {
    const path = sessionStorage.getItem(DISCOGS_RETURN_KEY);
    sessionStorage.removeItem(DISCOGS_RETURN_KEY);
    // Only same-site paths.
    return path?.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch {
    return null;
  }
}

function takeSignInNonce(): string | null {
  try {
    const nonce = sessionStorage.getItem(DISCOGS_SIGN_IN_NONCE_KEY);
    sessionStorage.removeItem(DISCOGS_SIGN_IN_NONCE_KEY);
    return nonce;
  } catch {
    return null;
  }
}

/**
 * Discogs redirects here after the user approves (or denies) access, for both
 * "Continue with Discogs" (this tab holds a sign-in nonce) and connecting
 * Discogs from settings. The token exchange always runs in Convex.
 */
function DiscogsCallbackPage() {
  const { oauth_token, oauth_verifier, denied } = Route.useSearch();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const completeConnection = useAction(api.discogs.completeConnection);
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current || isLoading) return;
    started.current = true;

    if (denied) {
      setError('Discogs access was not granted.');
      return;
    }
    if (!oauth_token || !oauth_verifier) {
      setError('Discogs did not return an authorization.');
      return;
    }

    const signInNonce = takeSignInNonce();
    if (signInNonce) {
      signIn('discogs', {
        oauthToken: oauth_token,
        oauthVerifier: oauth_verifier,
        nonce: signInNonce,
      })
        // /auth sends the user on to onboarding or the signed-in workspace.
        .then(() => navigate({ to: '/auth', replace: true }))
        .catch((err: unknown) => {
          console.error('Discogs sign-in failed:', err);
          setError('Could not sign in with Discogs. Please try again.');
        });
      return;
    }

    if (!isAuthenticated) {
      setError('This Discogs sign-in expired. Please start again.');
      return;
    }

    completeConnection({
      oauthToken: oauth_token,
      oauthVerifier: oauth_verifier,
    })
      .then(({ username }) => {
        toast.success(
          `Discogs connected as @${username}. Syncing your collection…`,
        );
        navigate({ to: takeReturnPath() ?? '/', replace: true });
      })
      .catch((err: unknown) => {
        console.error('Discogs callback failed:', err);
        setError('Could not finish connecting Discogs. Please try again.');
      });
  }, [
    isLoading,
    isAuthenticated,
    denied,
    oauth_token,
    oauth_verifier,
    completeConnection,
    signIn,
    navigate,
  ]);

  if (!error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-foreground">
        <section
          className="w-full max-w-md rounded-[1.5rem] border border-border bg-card p-7 text-center shadow-xl sm:p-9"
          aria-labelledby="callback-title"
          aria-live="polite"
        >
          <div
            className="relative mx-auto h-20 w-20 rounded-full bg-foreground shadow-lg motion-safe:animate-[spin_3s_linear_infinite] motion-reduce:animate-none"
            aria-hidden="true"
          >
            <div className="absolute inset-[14%] rounded-full border border-background/10" />
            <div className="absolute inset-[28%] rounded-full border border-background/10" />
            <div className="absolute inset-[36%] rounded-full bg-primary" />
            <div className="absolute inset-[47%] rounded-full bg-card" />
          </div>

          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Secure handoff
          </p>
          <h1
            id="callback-title"
            className="mt-2 text-2xl font-medium tracking-[-0.035em]"
          >
            Bringing you back to Crate
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            We’re securing your connection and preparing your collection. Keep
            this tab open for just a moment.
          </p>

          <div className="mt-7 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-foreground">
      <section
        className="w-full max-w-md rounded-[1.5rem] border border-border bg-card p-7 text-center shadow-xl sm:p-9"
        aria-labelledby="callback-error-title"
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Connection paused
        </p>
        <h1
          id="callback-error-title"
          className="mt-2 text-2xl font-medium tracking-[-0.035em]"
        >
          We couldn’t finish the handoff
        </h1>
        <p
          role="alert"
          className="mt-3 text-sm leading-6 text-muted-foreground"
        >
          {error}
        </p>
        <Button
          variant="outline"
          className="mt-7 h-11 w-full rounded-xl bg-background"
          onClick={() =>
            navigate({ to: takeReturnPath() ?? '/', replace: true })
          }
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Crate
        </Button>
      </section>
    </main>
  );
}
