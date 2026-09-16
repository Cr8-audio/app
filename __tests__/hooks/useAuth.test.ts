import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock the Convex modules
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useConvexAuth: vi.fn(),
}));

vi.mock('@/convex/_generated/api', () => ({
  api: {
    users: {
      getCurrentUser: 'users:getCurrentUser',
    },
  },
}));

import { useConvexAuth, useQuery } from 'convex/react';
import { useAuth } from '@/lib/hooks/useAuth';

const mockUseConvexAuth = useConvexAuth as ReturnType<typeof vi.fn>;
const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when not authenticated', () => {
    beforeEach(() => {
      mockUseConvexAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
      });
      mockUseQuery.mockReturnValue(null);
    });

    it('returns null user', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('returns null for user fields', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.username).toBeNull();
      expect(result.current.email).toBeNull();
      expect(result.current.displayName).toBeNull();
      expect(result.current.avatarUrl).toBeNull();
    });

    it('does not need onboarding', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.needsOnboarding).toBe(false);
    });
  });

  describe('when loading', () => {
    it('returns isLoading true when auth is loading', () => {
      mockUseConvexAuth.mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
      });
      mockUseQuery.mockReturnValue(undefined);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading true when authenticated but user data not loaded', () => {
      mockUseConvexAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
      });
      mockUseQuery.mockReturnValue(undefined);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('when authenticated with complete user', () => {
    const mockUser = {
      _id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
      onboardingComplete: true,
      onboardingStep: 'complete' as const,
    };

    beforeEach(() => {
      mockUseConvexAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
      });
      mockUseQuery.mockReturnValue(mockUser);
    });

    it('returns user data', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('returns user fields correctly', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.username).toBe('testuser');
      expect(result.current.email).toBe('test@example.com');
      expect(result.current.displayName).toBe('Test User');
      expect(result.current.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('does not need onboarding when complete', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.needsOnboarding).toBe(false);
      expect(result.current.onboardingComplete).toBe(true);
    });

    it('returns correct onboarding step', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.onboardingStep).toBe('complete');
      expect(result.current.needsUsername).toBe(false);
      expect(result.current.needsConnections).toBe(false);
    });
  });

  describe('onboarding states', () => {
    beforeEach(() => {
      mockUseConvexAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
      });
    });

    it('returns needsUsername when user has no username', () => {
      mockUseQuery.mockReturnValue({
        _id: 'user-123',
        email: 'test@example.com',
        username: null,
        onboardingComplete: false,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.needsOnboarding).toBe(true);
      expect(result.current.onboardingStep).toBe('username');
      expect(result.current.needsUsername).toBe(true);
      expect(result.current.needsConnections).toBe(false);
    });

    it('returns needsConnections when user has username but not complete', () => {
      mockUseQuery.mockReturnValue({
        _id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        onboardingComplete: false,
        onboardingStep: 'connections',
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.needsOnboarding).toBe(true);
      expect(result.current.onboardingStep).toBe('connections');
      expect(result.current.needsUsername).toBe(false);
      expect(result.current.needsConnections).toBe(true);
    });

    it('uses onboardingStep from user when available', () => {
      mockUseQuery.mockReturnValue({
        _id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        onboardingComplete: false,
        onboardingStep: 'connections',
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.onboardingStep).toBe('connections');
    });

    it('infers connections step when username exists but no onboardingStep', () => {
      mockUseQuery.mockReturnValue({
        _id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        onboardingComplete: false,
        // No onboardingStep field
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.onboardingStep).toBe('connections');
    });

    it('returns complete when onboardingComplete is true', () => {
      mockUseQuery.mockReturnValue({
        _id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        onboardingComplete: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.onboardingStep).toBe('complete');
      expect(result.current.onboardingComplete).toBe(true);
      expect(result.current.needsOnboarding).toBe(false);
    });
  });
});
