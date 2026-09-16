import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/lib/components/ui/button';
import { LoadingSpinner } from '@/lib/components/ui/loading';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DiscogsConnectionCard } from '@/lib/components/onboarding/DiscogsConnectionCard';
import { MusicServiceCard } from '@/lib/components/onboarding/MusicServiceCard';

export const Route = createFileRoute('/onboarding/connect')({
  component: OnboardingConnectPage,
});

function OnboardingConnectPage() {
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [isDiscogsConnected, setIsDiscogsConnected] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Redirect if user hasn't completed username step
  useEffect(() => {
    if (user && !user.username) {
      navigate({ to: '/onboarding', replace: true });
    }
  }, [user, navigate]);

  // Redirect if onboarding already complete
  useEffect(() => {
    if (user?.onboardingComplete && user?.username) {
      navigate({ to: `/${user.username}`, replace: true });
    }
  }, [user, navigate]);

  const handleDiscogsConnectionChange = useCallback((connected: boolean) => {
    setIsDiscogsConnected(connected);
  }, []);

  const handleContinue = async () => {
    setIsCompleting(true);

    try {
      await completeOnboarding();

      if (user?.username) {
        toast.success("You're all set! Welcome to Crate.");
        navigate({ to: `/${user.username}`, replace: true });
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast.error('Something went wrong. Please try again.');
      setIsCompleting(false);
    }
  };

  const handleSkip = async () => {
    setIsCompleting(true);

    try {
      await completeOnboarding();

      if (user?.username) {
        toast.success(
          'Welcome to Crate! You can connect services anytime in Settings.',
        );
        navigate({ to: `/${user.username}`, replace: true });
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast.error('Something went wrong. Please try again.');
      setIsCompleting(false);
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-lg border-2 border-gray-800 shadow-light p-8">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="w-12 h-1 bg-main rounded" />
              <div className="w-8 h-8 rounded-full bg-main flex items-center justify-center text-sm font-bold">
                2
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mb-8">Step 2 of 2</p>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4">
              <img src="/logo.svg" alt="Crate Logo" className="w-full h-full" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Connect Your Music</h1>
            <p className="text-gray-600">
              Connect your music services to start building your collection
            </p>
          </div>

          {/* Music Service Cards */}
          <div className="space-y-4 mb-8">
            <DiscogsConnectionCard
              onConnectionChange={handleDiscogsConnectionChange}
              variant="default"
            />

            <MusicServiceCard
              name="Spotify"
              description="Connect your Spotify account to sync your playlists and listening history."
              comingSoon
            />

            <MusicServiceCard
              name="Apple Music"
              description="Sync your Apple Music library and playlists with Crate."
              comingSoon
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {isDiscogsConnected ? (
              <Button
                onClick={handleContinue}
                disabled={isCompleting}
                className="w-full py-6 text-lg font-semibold bg-main hover:bg-mainAccent border-2 border-gray-800 shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all"
              >
                {isCompleting ? (
                  'Setting up your account...'
                ) : (
                  <>
                    Continue to Crate
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSkip}
                disabled={isCompleting}
                variant="outline"
                className="w-full py-6 text-lg font-semibold border-2 border-gray-800"
              >
                {isCompleting ? 'Setting up your account...' : 'Skip for now'}
              </Button>
            )}
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              You can always connect more services later in Settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
