import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/lib/components/ui/button';
import { LoadingSpinner } from '@/lib/components/ui/loading';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

  // Check username availability (skip if empty or invalid)
  const checkAvailability = useQuery(
    api.users.checkUsernameAvailable,
    username.length >= 3 && !validationError ? { username } : 'skip',
  );

  // Redirect based on onboarding state
  useEffect(() => {
    if (!user) return;

    // If onboarding complete, go to dashboard
    if (user.onboardingComplete && user.username) {
      navigate({ to: `/${user.username}`, replace: true });
      return;
    }

    // If user has username but not complete, they're on connections step
    if (user.username && user.onboardingStep === 'connections') {
      navigate({ to: '/onboarding/connect', replace: true });
      return;
    }
  }, [user, navigate]);

  // Suggest username from email
  useEffect(() => {
    if (user?.email && !username) {
      const suggestedUsername = (user.email as string).split('@')[0];
      setUsername(suggestedUsername);
      setDisplayName(suggestedUsername);
    }
  }, [user?.email, username]);

  // Client-side validation
  useEffect(() => {
    if (!username) {
      setValidationError(null);
      return;
    }

    if (username.length < 3) {
      setValidationError('Username must be at least 3 characters');
      return;
    }

    if (username.length > 30) {
      setValidationError('Username must be less than 30 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setValidationError(
        'Only letters, numbers, underscores, and hyphens allowed',
      );
      return;
    }

    setValidationError(null);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

      toast.success(`Great! Now let's connect your music.`);
      navigate({ to: '/onboarding/connect', replace: true });
    } catch (error) {
      console.error('Failed to set username:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to set username',
      );
      setIsSubmitting(false);
    }
  };

  // Show loading while fetching user data
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const isUsernameValid = username.length >= 3 && !validationError;
  const isAvailable = checkAvailability?.available === true;
  const canSubmit = isUsernameValid && isAvailable && !isSubmitting;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg border-2 border-gray-800 shadow-light p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4">
              <img src="/logo.svg" alt="Crate Logo" className="w-full h-full" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Welcome to Crate!</h1>
            <p className="text-gray-600">Choose your username to get started</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium mb-2"
              >
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="johndoe"
                  className="w-full px-4 py-3 border-2 border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-main"
                  disabled={isSubmitting}
                  autoFocus
                  required
                />
                {username.length >= 3 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkAvailability === undefined ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : isAvailable ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                )}
              </div>

              {/* Preview URL */}
              <p className="mt-2 text-sm text-gray-500">
                Your profile:{' '}
                <span className="font-mono">
                  crate.audio/{username || '...'}
                </span>
              </p>

              {/* Validation Messages */}
              {validationError && (
                <p className="mt-2 text-sm text-red-600">{validationError}</p>
              )}
              {!validationError &&
                checkAvailability &&
                !checkAvailability.available && (
                  <p className="mt-2 text-sm text-red-600">
                    {checkAvailability.error}
                  </p>
                )}
              {!validationError && isAvailable && (
                <p className="mt-2 text-sm text-green-600">
                  Username is available!
                </p>
              )}
            </div>

            {/* Display Name Input */}
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium mb-2"
              >
                Display Name (Optional)
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 border-2 border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-main"
                disabled={isSubmitting}
              />
              <p className="mt-2 text-sm text-gray-500">
                This is how your name will appear on your profile
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-6 text-lg font-semibold bg-main hover:bg-mainAccent border-2 border-gray-800 shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating your profile...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              You can change your username later in settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
