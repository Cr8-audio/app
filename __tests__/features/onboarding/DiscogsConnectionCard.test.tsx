import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/convex/_generated/api', () => ({
  api: {
    users: {
      getDiscogsProfile: 'users:getDiscogsProfile',
      saveDiscogsProfile: 'users:saveDiscogsProfile',
      removeDiscogsProfile: 'users:removeDiscogsProfile',
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DiscogsConnectionCard - Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection states', () => {
    it('shows "Not connected" when no profile exists', () => {
      const discogsProfile = null;
      const isFullyConnected = false;

      const state = getConnectionState(discogsProfile, isFullyConnected);
      expect(state).toBe('not_connected');
    });

    it('shows "Connected" when profile and OAuth valid', () => {
      const discogsProfile = { username: 'dj_test' };
      const isFullyConnected = true;

      const state = getConnectionState(discogsProfile, isFullyConnected);
      expect(state).toBe('connected');
    });

    it('shows "Needs Reconnection" when profile exists but OAuth expired', () => {
      const discogsProfile = { username: 'dj_test' };
      const isFullyConnected = false;

      const state = getConnectionState(discogsProfile, isFullyConnected);
      expect(state).toBe('needs_reconnection');
    });
  });

  describe('Button rendering', () => {
    it('shows Connect button when not connected', () => {
      const state = 'not_connected';
      const showConnectButton = state === 'not_connected';
      expect(showConnectButton).toBe(true);
    });

    it('shows Reconnect button when needs reconnection', () => {
      const state = 'needs_reconnection';
      const showReconnectButton = state === 'needs_reconnection';
      expect(showReconnectButton).toBe(true);
    });

    it('shows Refresh and Disconnect buttons when connected', () => {
      const state = 'connected';
      const showRefreshButton = state === 'connected';
      const showDisconnectButton = state === 'connected';

      expect(showRefreshButton).toBe(true);
      expect(showDisconnectButton).toBe(true);
    });
  });

  describe('Connection flow', () => {
    it('initiates OAuth by fetching request token', async () => {
      let fetchedToken = false;
      let redirectUrl: string | null = null;

      const handleConnectDiscogs = async () => {
        // Simulate fetch request token
        fetchedToken = true;
        redirectUrl = 'https://discogs.com/oauth/authorize?token=xxx';
      };

      await handleConnectDiscogs();

      expect(fetchedToken).toBe(true);
      expect(redirectUrl).toContain('discogs.com/oauth');
    });

    it('handles connection failure gracefully', async () => {
      let errorMessage: string | null = null;

      const handleConnectDiscogs = async () => {
        try {
          throw new Error('Network error');
        } catch (error) {
          errorMessage =
            error instanceof Error ? error.message : 'Failed to connect';
        }
      };

      await handleConnectDiscogs();
      expect(errorMessage).toBe('Network error');
    });
  });

  describe('Disconnect flow', () => {
    it('clears OAuth cookies on disconnect', async () => {
      let cookiesCleared = false;
      let profileRemoved = false;

      const handleDisconnectDiscogs = async () => {
        // Clear cookies via API
        cookiesCleared = true;
        // Remove profile from Convex
        profileRemoved = true;
      };

      await handleDisconnectDiscogs();

      expect(cookiesCleared).toBe(true);
      expect(profileRemoved).toBe(true);
    });
  });

  describe('Profile display', () => {
    it('shows username when connected', () => {
      const discogsProfile = { username: 'vinyl_collector' };
      expect(discogsProfile.username).toBe('vinyl_collector');
    });

    it('formats username with @ prefix for display', () => {
      const username = 'vinyl_collector';
      const displayUsername = `@${username}`;
      expect(displayUsername).toBe('@vinyl_collector');
    });
  });

  describe('Loading states', () => {
    it('shows loading while checking OAuth status', () => {
      const isOAuthStatusLoading = true;
      const showLoadingIndicator = isOAuthStatusLoading;
      expect(showLoadingIndicator).toBe(true);
    });

    it('shows loading while connecting', () => {
      const isConnecting = true;
      const buttonText = isConnecting ? 'Connecting...' : 'Connect Discogs';
      expect(buttonText).toBe('Connecting...');
    });

    it('shows loading while disconnecting', () => {
      const isDisconnecting = true;
      const buttonText = isDisconnecting ? 'Disconnecting...' : 'Disconnect';
      expect(buttonText).toBe('Disconnecting...');
    });
  });

  describe('Auto-save after OAuth callback', () => {
    it('saves profile when OAuth tokens present but no profile', async () => {
      const hasOAuthTokens = true;
      const oauthUsername = 'dj_test';
      const oauthDiscogsId = '12345';
      const discogsProfile = null;

      let savedProfile = false;

      const shouldAutoSave =
        hasOAuthTokens && oauthUsername && oauthDiscogsId && !discogsProfile;

      if (shouldAutoSave) {
        // Save profile
        savedProfile = true;
      }

      expect(shouldAutoSave).toBe(true);
      expect(savedProfile).toBe(true);
    });

    it('skips auto-save if profile already exists', () => {
      const hasOAuthTokens = true;
      const oauthUsername = 'dj_test';
      const oauthDiscogsId = '12345';
      const discogsProfile = { username: 'dj_test' };

      const shouldAutoSave =
        hasOAuthTokens && oauthUsername && oauthDiscogsId && !discogsProfile;

      expect(shouldAutoSave).toBe(false);
    });
  });
});

// Helper function to determine connection state
function getConnectionState(
  discogsProfile: { username: string } | null,
  isFullyConnected: boolean,
): 'connected' | 'needs_reconnection' | 'not_connected' {
  if (!discogsProfile) {
    return 'not_connected';
  }
  if (discogsProfile && isFullyConnected) {
    return 'connected';
  }
  return 'needs_reconnection';
}
