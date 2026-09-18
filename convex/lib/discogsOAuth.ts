/**
 * Pure helpers for the Discogs connection flow (no Convex or network access),
 * so they can be unit-tested directly.
 */

const ALLOWED_ORIGINS = new Set([
  'https://cr8.audio',
  'https://www.cr8.audio',
  'http://localhost:1995',
]);

// Staging (`crate-app`) and PR previews (`crate-app-pr-<n>`) on workers.dev.
const WORKERS_ORIGIN =
  /^https:\/\/crate-app(-pr-\d+)?\.[a-z0-9-]+\.workers\.dev$/;

// PR previews on their own custom domain (`pr-<n>.cr8.audio`).
const PREVIEW_ORIGIN = /^https:\/\/pr-\d+\.cr8\.audio$/;

/** Only origins we deploy to may receive the Discogs OAuth redirect. */
export function isAllowedAppOrigin(origin: string): boolean {
  return (
    ALLOWED_ORIGINS.has(origin) ||
    WORKERS_ORIGIN.test(origin) ||
    PREVIEW_ORIGIN.test(origin)
  );
}

export const DISCOGS_CALLBACK_PATH = '/connect/discogs/callback';

export function discogsCallbackUrl(origin: string): string {
  return `${origin}${DISCOGS_CALLBACK_PATH}`;
}

/** A request token is only good for the few minutes the user spends on Discogs. */
export const OAUTH_REQUEST_TTL_MS = 15 * 60 * 1000;

export function isRequestExpired(createdAt: number, now: number): boolean {
  return now - createdAt > OAUTH_REQUEST_TTL_MS;
}

/**
 * Which `user_releases.user_id` a user's collection lives under.
 *
 * Rows migrated from Supabase use the Supabase id, earlier ingests used the
 * email, new ones use the Convex id. Reuse whichever already has rows so a
 * sync never splits one collection across two keys.
 */
export function pickCollectionOwnerKey(
  candidates: Array<{ key: string; hasRows: boolean }>,
  fallback: string,
): string {
  return candidates.find((c) => c.hasRows)?.key ?? fallback;
}

/** Release ids present locally but no longer in the Discogs collection. */
export function releasesToRemove(
  storedIds: Array<string | number>,
  currentIds: Iterable<string | number>,
): string[] {
  const keep = new Set(Array.from(currentIds, String));
  return storedIds.map(String).filter((id) => !keep.has(id));
}

/**
 * Stored release data comes in two shapes: a Discogs collection item
 * (`{ id, basic_information }`, from sync) or a bare release object (some
 * migrated rows). Normalize to the collection-item shape; drop anything else.
 */
export function toCollectionRelease(
  discogsReleaseId: string | number,
  data: unknown,
): { id: number; basic_information: Record<string, unknown> } | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const id = Number(discogsReleaseId);
  if (
    record.basic_information &&
    typeof record.basic_information === 'object'
  ) {
    return {
      ...record,
      id,
      basic_information: record.basic_information as Record<string, unknown>,
    };
  }
  if (typeof record.title === 'string') {
    return { id, basic_information: record };
  }
  return null;
}

/** Sign-in nonces are random per browser; anything shorter is a mistake. */
export const MIN_SIGN_IN_NONCE_LENGTH = 32;

/** SHA-256 hex of a sign-in nonce; only the hash is stored server-side. */
export async function hashNonce(nonce: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(nonce),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * Turn a Discogs username into a Crate username suggestion (3-30 chars of
 * letters, numbers, `_` and `-`), or null if nothing usable is left.
 */
export function suggestUsername(discogsUsername: string): string | null {
  const cleaned = discogsUsername
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  return cleaned.length >= 3 ? cleaned : null;
}
