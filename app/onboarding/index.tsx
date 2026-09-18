import { useEffect, useState } from 'react';
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { Check, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import { suggestUsername } from '@/convex/lib/discogsOAuth';
import { getUsernameValidationError } from '@/convex/lib/username';
import { Button } from '@/lib/components/ui/button';
import { LoadingSpinner } from '@/lib/components/ui/loading';

export const Route = createFileRoute('/onboarding/')({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);
  const setUsernameMutation = useMutation(api.users.setUsername);

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const checkAvailability = useQuery(
    api.users.checkUsernameAvailable,
    username.length >= 3 && !validationError ? { username } : 'skip',
  );

  useEffect(() => {
    if (!user) return;

    if (user.username) {
      navigate({ to: '/analyze/chat', replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.displayName && !username) {
      setUsername(suggestUsername(user.displayName) ?? '');
      setDisplayName(user.displayName);
    }
  }, [user?.displayName, username]);

  useEffect(() => {
    if (!username) {
      setValidationError(null);
      return;
    }

    const error = getUsernameValidationError(username);
    setValidationError(error);
  }, [username]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (checkAvailability && !checkAvailability.available) {
      toast.error(checkAvailability.error || 'Username is not available');
      return;
    }

    setIsSubmitting(true);

    try {
      await setUsernameMutation({
        username: username.toLowerCase(),
        displayName: displayName || username,
      });

      toast.success('Welcome to Crate. Your collection is syncing.');
      navigate({ to: '/analyze/chat', replace: true });
    } catch (error) {
      console.error('Failed to set username:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to set username',
      );
      setIsSubmitting(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <LoadingSpinner className="h-5 w-5" />
        <p className="text-sm text-muted-foreground">
          Preparing your collection…
        </p>
      </div>
    );
  }

  if (user === null) {
    return <Navigate to="/auth" replace />;
  }

  const isUsernameValid = username.length >= 3 && !validationError;
  const isAvailable = checkAvailability?.available === true;
  const canSubmit = isUsernameValid && isAvailable && !isSubmitting;
  const availabilityError =
    !validationError && checkAvailability && !checkAvailability.available
      ? checkAvailability.error
      : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 py-6 text-foreground sm:px-8 sm:py-10 lg:px-10">
      <div
        className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="mb-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground">
              <span className="h-3 w-3 rounded-full border-[3px] border-background bg-primary" />
            </span>
            <span className="text-lg font-semibold tracking-[-0.04em]">
              Crate
            </span>
          </div>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
            Step 1 of 1
          </span>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <section className="max-w-lg pt-3" aria-labelledby="onboarding-title">
            <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-px w-8 bg-primary" />
              One last detail
            </p>
            <h1
              id="onboarding-title"
              className="text-5xl font-medium leading-[0.96] tracking-[-0.055em] sm:text-6xl"
            >
              Make the collection yours.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
              Pick the name people will see around Crate. Your Discogs
              connection is ready; we’ll start bringing in your collection after
              this.
            </p>

            <div className="mt-9 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Discogs connected</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Signed in as {user.displayName || 'your Discogs account'}.
                    No second connection step needed.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            className="rounded-[1.5rem] border border-border bg-card p-6 shadow-xl sm:p-8"
            aria-label="Choose your Crate username"
          >
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Your Crate identity
              </p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.035em]">
                Choose how you’ll appear
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-semibold"
                >
                  Username
                </label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value.toLowerCase())
                    }
                    placeholder="yourname"
                    className="h-12 w-full rounded-xl border border-input bg-background px-4 pr-12 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(validationError || availabilityError)}
                    aria-describedby="username-preview username-status"
                    autoCapitalize="none"
                    autoComplete="username"
                    spellCheck={false}
                    autoFocus
                    required
                  />
                  {validationError ? (
                    <XCircle
                      className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-destructive"
                      aria-hidden="true"
                    />
                  ) : username.length >= 3 ? (
                    checkAvailability === undefined ? (
                      <Loader2
                        className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : isAvailable ? (
                      <CheckCircle
                        className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ok"
                        aria-hidden="true"
                      />
                    ) : (
                      <XCircle
                        className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-destructive"
                        aria-hidden="true"
                      />
                    )
                  ) : null}
                </div>

                <div className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs">
                  <p id="username-preview" className="text-muted-foreground">
                    crate.audio/
                    <span className="font-mono text-foreground">
                      {username || 'yourname'}
                    </span>
                  </p>
                  <div
                    id="username-status"
                    className="min-h-5 text-right"
                    aria-live="polite"
                  >
                    {validationError && (
                      <p className="text-destructive">{validationError}</p>
                    )}
                    {availabilityError && (
                      <p className="text-destructive">{availabilityError}</p>
                    )}
                    {!validationError && isAvailable && (
                      <p className="text-ok">Available</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-baseline justify-between gap-4">
                  <label
                    htmlFor="displayName"
                    className="text-sm font-semibold"
                  >
                    Display name
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Optional
                  </span>
                </div>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="The name people know you by"
                  className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  autoComplete="name"
                  aria-describedby="display-name-help"
                />
                <p
                  id="display-name-help"
                  className="mt-2 text-xs leading-5 text-muted-foreground"
                >
                  We’ve used your Discogs display name. Edit it if you like.
                </p>
              </div>

              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-12 w-full rounded-xl text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Opening your Crate…
                  </>
                ) : (
                  'Enter Crate'
                )}
              </Button>
            </form>

            <p className="mt-5 border-t border-border pt-5 text-center text-xs leading-5 text-muted-foreground">
              This becomes the address for your personal Crate.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
