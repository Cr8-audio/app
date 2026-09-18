import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/lib/components/ui/button';
import { LoaderCircle } from 'lucide-react';
import {
  DISCOGS_RETURN_KEY,
  DISCOGS_SIGN_IN_NONCE_KEY,
} from '@/lib/hooks/useDiscogsConnection';

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** "Continue with Discogs": the only way to sign in to Crate. */
const SignInButton = () => {
  const startSignIn = useAction(api.discogs.startSignIn);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // The nonce stays in this tab; the callback proves it started here.
      const nonce = randomNonce();
      sessionStorage.setItem(DISCOGS_SIGN_IN_NONCE_KEY, nonce);
      sessionStorage.removeItem(DISCOGS_RETURN_KEY);
      const { authUrl } = await startSignIn({
        origin: window.location.origin,
        nonce,
      });
      window.location.href = authUrl;
    } catch (err) {
      console.error('Failed to start Discogs sign-in:', err);
      setError('Could not reach Discogs. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleSignIn}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2"
      >
        {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {isLoading ? 'Redirecting to Discogs…' : 'Continue with Discogs'}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default SignInButton;
