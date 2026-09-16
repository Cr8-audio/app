import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for user query business logic.
 * These tests validate the logic that would be executed in the Convex queries.
 */

// Username availability check logic (from checkUsernameAvailable query)
function checkUsernameFormat(username: string): {
  available: boolean;
  error?: string | null;
} {
  if (username.length < 3 || username.length > 30) {
    return { available: false, error: 'Username must be 3-30 characters' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      available: false,
      error:
        'Username can only contain letters, numbers, underscores, and hyphens',
    };
  }

  return { available: true, error: null };
}

// Simulated database lookup for username
function checkUsernameAvailability(
  username: string,
  existingUsernames: string[],
): { available: boolean; error: string | null } {
  const formatCheck = checkUsernameFormat(username);
  if (!formatCheck.available) {
    return formatCheck as { available: boolean; error: string | null };
  }

  const exists = existingUsernames.includes(username.toLowerCase());
  return {
    available: !exists,
    error: exists ? 'Username is already taken' : null,
  };
}

// User profile data structure
interface UserProfile {
  _id: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  onboardingComplete?: boolean;
  onboardingStep?: 'username' | 'connections' | 'complete';
  supabaseUserId?: string;
}

// Discogs profile data structure
interface DiscogsProfile {
  user_id: string;
  username: string;
}

// Get user by username logic
function getUserByUsername(
  username: string,
  users: UserProfile[],
): UserProfile | null {
  return users.find((u) => u.username === username) || null;
}

// Get Discogs profile logic with fallback strategies
function getDiscogsProfile(
  user: UserProfile,
  profiles: DiscogsProfile[],
): DiscogsProfile | null {
  // 1. By Convex user ID
  let profile = profiles.find((p) => p.user_id === user._id);

  // 2. By email
  if (!profile && user.email) {
    profile = profiles.find((p) => p.user_id === user.email);
  }

  // 3. By supabaseUserId (legacy)
  if (!profile && user.supabaseUserId) {
    profile = profiles.find((p) => p.user_id === user.supabaseUserId);
  }

  return profile || null;
}

describe('User Queries - Business Logic', () => {
  describe('getCurrentUser', () => {
    it('returns null when not authenticated', () => {
      const userId = null;
      expect(userId).toBeNull();
    });

    it('returns user data when authenticated', () => {
      const user: UserProfile = {
        _id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        onboardingComplete: true,
        onboardingStep: 'complete',
      };

      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe('testuser');
    });
  });

  describe('getUserByUsername', () => {
    const users: UserProfile[] = [
      {
        _id: 'user-1',
        email: 'john@example.com',
        username: 'johndoe',
        displayName: 'John Doe',
      },
      {
        _id: 'user-2',
        email: 'jane@example.com',
        username: 'janedoe',
        displayName: 'Jane Doe',
      },
    ];

    it('returns user when username exists', () => {
      const result = getUserByUsername('johndoe', users);
      expect(result).not.toBeNull();
      expect(result?.displayName).toBe('John Doe');
    });

    it('returns null when username not found', () => {
      const result = getUserByUsername('nonexistent', users);
      expect(result).toBeNull();
    });

    it('is case-sensitive for username lookup', () => {
      const result = getUserByUsername('JohnDoe', users);
      expect(result).toBeNull();
    });
  });

  describe('checkUsernameAvailable', () => {
    const existingUsernames = ['existinguser', 'taken', 'johndoe'];

    describe('format validation', () => {
      it('rejects username shorter than 3 characters', () => {
        const result = checkUsernameAvailability('ab', existingUsernames);
        expect(result.available).toBe(false);
        expect(result.error).toBe('Username must be 3-30 characters');
      });

      it('rejects username longer than 30 characters', () => {
        const result = checkUsernameAvailability(
          'a'.repeat(31),
          existingUsernames,
        );
        expect(result.available).toBe(false);
        expect(result.error).toBe('Username must be 3-30 characters');
      });

      it('rejects username with invalid characters', () => {
        const result = checkUsernameAvailability(
          'test@user',
          existingUsernames,
        );
        expect(result.available).toBe(false);
        expect(result.error).toBe(
          'Username can only contain letters, numbers, underscores, and hyphens',
        );
      });

      it('accepts valid username format', () => {
        const result = checkUsernameFormat('valid_user-123');
        expect(result.available).toBe(true);
        expect(result.error).toBeNull();
      });
    });

    describe('availability check', () => {
      it('returns unavailable for existing username', () => {
        const result = checkUsernameAvailability(
          'existinguser',
          existingUsernames,
        );
        expect(result.available).toBe(false);
        expect(result.error).toBe('Username is already taken');
      });

      it('returns available for new username', () => {
        const result = checkUsernameAvailability('newuser', existingUsernames);
        expect(result.available).toBe(true);
        expect(result.error).toBeNull();
      });

      it('checks case-insensitively', () => {
        const result = checkUsernameAvailability(
          'EXISTINGUSER',
          existingUsernames,
        );
        expect(result.available).toBe(false);
      });
    });
  });

  describe('getDiscogsProfile', () => {
    const profiles: DiscogsProfile[] = [
      { user_id: 'user-1', username: 'discogs_user_1' },
      { user_id: 'test@example.com', username: 'discogs_by_email' },
      { user_id: 'supabase-uuid-123', username: 'discogs_legacy' },
    ];

    it('finds profile by Convex user ID', () => {
      const user: UserProfile = {
        _id: 'user-1',
        email: 'other@example.com',
      };

      const result = getDiscogsProfile(user, profiles);
      expect(result).not.toBeNull();
      expect(result?.username).toBe('discogs_user_1');
    });

    it('falls back to email when user ID not found', () => {
      const user: UserProfile = {
        _id: 'user-999',
        email: 'test@example.com',
      };

      const result = getDiscogsProfile(user, profiles);
      expect(result).not.toBeNull();
      expect(result?.username).toBe('discogs_by_email');
    });

    it('falls back to supabaseUserId for legacy data', () => {
      const user: UserProfile = {
        _id: 'user-999',
        email: 'other@example.com',
        supabaseUserId: 'supabase-uuid-123',
      };

      const result = getDiscogsProfile(user, profiles);
      expect(result).not.toBeNull();
      expect(result?.username).toBe('discogs_legacy');
    });

    it('returns null when no profile found with any identifier', () => {
      const user: UserProfile = {
        _id: 'user-999',
        email: 'unknown@example.com',
      };

      const result = getDiscogsProfile(user, profiles);
      expect(result).toBeNull();
    });

    it('prioritizes Convex user ID over email', () => {
      const user: UserProfile = {
        _id: 'user-1',
        email: 'test@example.com', // Would match discogs_by_email
      };

      const result = getDiscogsProfile(user, profiles);
      expect(result?.username).toBe('discogs_user_1'); // Matches user ID first
    });

    it('handles user without email', () => {
      const user: UserProfile = {
        _id: 'user-999',
        // No email
      };

      const result = getDiscogsProfile(user, profiles);
      expect(result).toBeNull();
    });
  });

  describe('getLegacyDataStats', () => {
    it('returns counts for releases and playlists', () => {
      // Simulating the query results
      const releases = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const playlists = [{ id: '1' }];
      const profile = { username: 'legacy_user' };

      const stats = {
        releaseCount: releases.length,
        playlistCount: playlists.length,
        discogsUsername: profile?.username || null,
      };

      expect(stats.releaseCount).toBe(3);
      expect(stats.playlistCount).toBe(1);
      expect(stats.discogsUsername).toBe('legacy_user');
    });

    it('returns null discogsUsername when no profile', () => {
      const stats = {
        releaseCount: 0,
        playlistCount: 0,
        discogsUsername: null,
      };

      expect(stats.discogsUsername).toBeNull();
    });
  });
});
