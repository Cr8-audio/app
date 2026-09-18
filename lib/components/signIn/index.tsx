import { useState } from 'react';
import { useAction } from 'convex/react';
import { ArrowUpRight, Disc3, LoaderCircle } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/lib/components/ui/button';
import {
  DISCOGS_RETURN_KEY,
  DISCOGS_SIGN_IN_NONCE_KEY,
} from '@/lib/hooks/useDiscogsConnection';
import { cn } from '@/lib/utils/tailwind';

interface SignInButtonProps {
  className?: string;
}

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

/** "Continue with Discogs": the only way to sign in to Crate. */
const SignInButton = ({ className }: SignInButtonProps) => {
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
    <div className="w-full">
      <Button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        aria-busy={isLoading}
        className={cn(
          'h-12 w-full rounded-xl px-4 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:translate-y-0',
          className,
        )}
      >
        {isLoading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Disc3 className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{isLoading ? 'Opening Discogs…' : 'Continue with Discogs'}</span>
        {!isLoading && (
          <ArrowUpRight className="ml-auto h-4 w-4" aria-hidden="true" />
        )}
      </Button>
      <div className="min-h-6" aria-live="polite">
        {error && (
          <p
            role="alert"
            className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default SignInButton;
