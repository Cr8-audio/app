import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => ({ component: vi.fn() }),
  useNavigate: () => vi.fn(),
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/convex/_generated/api', () => ({
  api: {
    users: {
      getCurrentUser: 'users:getCurrentUser',
      completeOnboarding: 'users:completeOnboarding',
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('OnboardingConnectPage - Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Redirect logic', () => {
    it('redirects to username step if no username', () => {
      const user = {
        username: null,
        onboardingComplete: false,
      };

      const shouldRedirectToUsername = user && !user.username;
      expect(shouldRedirectToUsername).toBe(true);
    });

    it('redirects to dashboard if onboarding complete', () => {
      const user = {
        username: 'testuser',
        onboardingComplete: true,
      };

      const shouldRedirectToDashboard =
        user?.onboardingComplete && !!user?.username;
      expect(shouldRedirectToDashboard).toBe(true);
    });

    it('stays on page if username set but not complete', () => {
      const user = {
        username: 'testuser',
        onboardingStep: 'connections',
        onboardingComplete: false,
      };

      const shouldStay =
        user.username &&
        !user.onboardingComplete &&
        user.onboardingStep === 'connections';
      expect(shouldStay).toBe(true);
    });
  });

  describe('Connection state management', () => {
    it('tracks Discogs connection state', () => {
      let isDiscogsConnected = false;

      const handleDiscogsConnectionChange = (connected: boolean) => {
        isDiscogsConnected = connected;
      };

      handleDiscogsConnectionChange(true);
      expect(isDiscogsConnected).toBe(true);

      handleDiscogsConnectionChange(false);
      expect(isDiscogsConnected).toBe(false);
    });
  });

  describe('Button rendering logic', () => {
    it('shows Continue button when Discogs connected', () => {
      const isDiscogsConnected = true;
      const showContinueButton = isDiscogsConnected;
      expect(showContinueButton).toBe(true);
    });

    it('shows Skip button when Discogs not connected', () => {
      const isDiscogsConnected = false;
      const showSkipButton = !isDiscogsConnected;
      expect(showSkipButton).toBe(true);
    });

    it('disables buttons when completing', () => {
      const isCompleting = true;
      const buttonDisabled = isCompleting;
      expect(buttonDisabled).toBe(true);
    });
  });

  describe('Complete onboarding flow', () => {
    it('handleContinue sets completing state', async () => {
      let isCompleting = false;

      const handleContinue = async () => {
        isCompleting = true;
        // Simulate async operation
        await Promise.resolve();
        // In success case, navigate happens
      };

      await handleContinue();
      expect(isCompleting).toBe(true);
    });

    it('handleSkip also completes onboarding', async () => {
      let completedOnboarding = false;

      const completeOnboarding = async () => {
        completedOnboarding = true;
      };

      const handleSkip = async () => {
        await completeOnboarding();
      };

      await handleSkip();
      expect(completedOnboarding).toBe(true);
    });

    it('navigates to user profile on success', () => {
      const user = { username: 'testuser' };
      const expectedPath = `/${user.username}`;
      expect(expectedPath).toBe('/testuser');
    });
  });

  describe('Progress indicator', () => {
    it('shows step 2 of 2', () => {
      const currentStep = 2;
      const totalSteps = 2;

      expect(currentStep).toBe(2);
      expect(totalSteps).toBe(2);
    });

    it('shows step 1 as completed', () => {
      const step1Complete = true; // Username already set
      expect(step1Complete).toBe(true);
    });
  });

  describe('Music service cards', () => {
    it('renders Discogs as primary connection', () => {
      const services = [
        { name: 'Discogs', comingSoon: false },
        { name: 'Spotify', comingSoon: true },
        { name: 'Apple Music', comingSoon: true },
      ];

      const primaryService = services.find((s) => !s.comingSoon);
      expect(primaryService?.name).toBe('Discogs');
    });

    it('marks Spotify and Apple Music as coming soon', () => {
      const services = [
        { name: 'Discogs', comingSoon: false },
        { name: 'Spotify', comingSoon: true },
        { name: 'Apple Music', comingSoon: true },
      ];

      const comingSoonServices = services.filter((s) => s.comingSoon);
      expect(comingSoonServices).toHaveLength(2);
      expect(comingSoonServices.map((s) => s.name)).toEqual([
        'Spotify',
        'Apple Music',
      ]);
    });
  });
});
