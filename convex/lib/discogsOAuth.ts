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

/** Only origins we deploy to may receive the Discogs OAuth redirect. */
export function isAllowedAppOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.has(origin) || WORKERS_ORIGIN.test(origin);
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
