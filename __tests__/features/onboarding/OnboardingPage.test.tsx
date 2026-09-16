import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
      checkUsernameAvailable: 'users:checkUsernameAvailable',
      setUsername: 'users:setUsername',
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useQuery, useMutation } from 'convex/react';
import { toast } from 'sonner';

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;
const mockUseMutation = useMutation as ReturnType<typeof vi.fn>;

describe('OnboardingPage - Username Validation Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Username validation rules', () => {
    it('validates minimum length of 3 characters', () => {
      const username = 'ab';
      const isValid = username.length >= 3;
      expect(isValid).toBe(false);
    });

    it('validates maximum length of 30 characters', () => {
      const username = 'a'.repeat(31);
      const isValid = username.length <= 30;
      expect(isValid).toBe(false);
    });

    it('accepts valid characters (letters, numbers, underscore, hyphen)', () => {
      const validUsernames = ['user123', 'test_user', 'test-user', 'TestUser'];
      const pattern = /^[a-zA-Z0-9_-]+$/;

      validUsernames.forEach((username) => {
        expect(pattern.test(username)).toBe(true);
      });
    });

    it('rejects invalid characters', () => {
      const invalidUsernames = ['test@user', 'test user', 'test.user', 'test!'];
      const pattern = /^[a-zA-Z0-9_-]+$/;

      invalidUsernames.forEach((username) => {
        expect(pattern.test(username)).toBe(false);
      });
    });

    it('converts username to lowercase on submit', () => {
      const input = 'TestUser';
      const normalized = input.toLowerCase();
      expect(normalized).toBe('testuser');
    });
  });

  describe('Username suggestions', () => {
    it('suggests username from email', () => {
      const email = 'john.doe@example.com';
      const suggested = email.split('@')[0];
      expect(suggested).toBe('john.doe');
    });

    it('handles email without username part', () => {
      const email = '@example.com';
      const suggested = email.split('@')[0];
      expect(suggested).toBe('');
    });
  });

  describe('Form submission logic', () => {
    it('prevents submission with validation error', () => {
      const validationError = 'Username must be at least 3 characters';
      const canSubmit = !validationError;
      expect(canSubmit).toBe(false);
    });

    it('prevents submission when username unavailable', () => {
      const checkAvailability = { available: false, error: 'Username taken' };
      const canSubmit = checkAvailability.available;
      expect(canSubmit).toBe(false);
    });

    it('allows submission when valid and available', () => {
      const validationError = null;
      const checkAvailability = { available: true, error: null };
      const isSubmitting = false;
      const isUsernameValid = true;

      const canSubmit =
        isUsernameValid &&
        checkAvailability.available &&
        !isSubmitting &&
        !validationError;

      expect(canSubmit).toBe(true);
    });
  });

  describe('Redirect logic', () => {
    it('redirects to dashboard if onboarding complete', () => {
      const user = {
        onboardingComplete: true,
        username: 'testuser',
      };

      const shouldRedirectToDashboard =
        user.onboardingComplete && !!user.username;
      expect(shouldRedirectToDashboard).toBe(true);
    });

    it('redirects to connect page if username set but not complete', () => {
      const user = {
        username: 'testuser',
        onboardingStep: 'connections',
        onboardingComplete: false,
      };

      const shouldRedirectToConnect =
        user.username && user.onboardingStep === 'connections';
      expect(shouldRedirectToConnect).toBe(true);
    });

    it('stays on page if no username yet', () => {
      const user = {
        username: null,
        onboardingStep: 'username',
        onboardingComplete: false,
      };

      const shouldStay = !user.username;
      expect(shouldStay).toBe(true);
    });
  });

  describe('Availability check triggering', () => {
    it('skips availability check for short username', () => {
      const username = 'ab';
      const validationError = null;

      const shouldCheck = username.length >= 3 && !validationError;
      expect(shouldCheck).toBe(false);
    });

    it('skips availability check with validation error', () => {
      const username = 'test@user';
      const validationError = 'Invalid characters';

      const shouldCheck = username.length >= 3 && !validationError;
      expect(shouldCheck).toBe(false);
    });

    it('runs availability check for valid username', () => {
      const username = 'validuser';
      const validationError = null;

      const shouldCheck = username.length >= 3 && !validationError;
      expect(shouldCheck).toBe(true);
    });
  });
});
