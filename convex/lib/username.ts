const RESERVED_USERNAMES = new Set([
  'analyze',
  'auth',
  'connect',
  'onboarding',
]);

export function getUsernameValidationError(username: string): string | null {
  if (username.length < 3 || username.length > 30) {
    return 'Username must be 3-30 characters';
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return 'Username can only contain letters, numbers, underscores, and hyphens';
  }

  if (RESERVED_USERNAMES.has(username.toLowerCase())) {
    return 'That username is reserved by Crate';
  }

  return null;
}
