import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useConvexAuth } from 'convex/react';

type OnboardingStep = 'username' | 'complete';

/**
 * Custom hook to manage authentication state
 * This replaces the Zustand auth store and provides a clean interface
 * for components to access auth data from Convex
 */
export function useAuth() {
  // Get Convex auth loading state
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();

  // Get current user data
  const user = useQuery(api.users.getCurrentUser);

  // Compute loading state - we're loading if auth is initializing OR if we're authenticated but user data hasn't loaded yet
  const isLoading = isAuthLoading || (isAuthenticated && user === undefined);

  // Determine current onboarding step
  const getOnboardingStep = (): OnboardingStep =>
    user?.username ? 'complete' : 'username';

  const onboardingStep = getOnboardingStep();

  return {
    // User data
    user: user || null,
    username: user?.username || null,
    email: user?.email || null,
    displayName: user?.displayName || null,
    avatarUrl: user?.avatarUrl || null,

    // Auth state
    isAuthenticated: isAuthenticated && !!user,
    isLoading,

    // Onboarding state
    // Onboarding is picking a username (Discogs sign-in connected the rest).
    needsOnboarding: isAuthenticated && user !== undefined && !user?.username,
    onboardingStep,
    needsUsername: onboardingStep === 'username',
    onboardingComplete: onboardingStep === 'complete',
  };
}

export default useAuth;
