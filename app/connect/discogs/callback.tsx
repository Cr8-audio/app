import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useAction, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/lib/components/ui/button';
import { LoadingSpinner } from '@/lib/components/ui/loading';
import { DISCOGS_RETURN_KEY } from '@/lib/hooks/useDiscogsConnection';
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

/**
 * Discogs redirects here after the user approves (or denies) access.
 * The token exchange runs in Convex, authenticated as the signed-in user.
 */
function DiscogsCallbackPage() {
  const { oauth_token, oauth_verifier, denied } = Route.useSearch();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const completeConnection = useAction(api.discogs.completeConnection);
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
    if (!isAuthenticated) {
      setError('Sign in to Crate, then connect Discogs again.');
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
    navigate,
  ]);

  if (!error) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <LoadingSpinner />
        <p className="text-sm text-gray-600">Connecting Discogs…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
      <p className="text-gray-800">{error}</p>
      <Button
        variant="outline"
        onClick={() => navigate({ to: takeReturnPath() ?? '/', replace: true })}
      >
        Go back
      </Button>
    </div>
  );
}
