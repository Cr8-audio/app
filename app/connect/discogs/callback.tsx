import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useAction, useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/lib/components/ui/button';
import { LoadingSpinner } from '@/lib/components/ui/loading';
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
 * "Continue with Discogs"(this tab holds a sign-in nonce) and connecting
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
        // /auth sends the user on to onboarding or their profile.
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
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground">Talking to Discogs…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
      <p className="text-foreground">{error}</p>
      <Button
        variant="outline"
        onClick={() => navigate({ to: takeReturnPath() ?? '/', replace: true })}
      >
        Go back
      </Button>
    </div>
  );
}
