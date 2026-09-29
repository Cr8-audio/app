/** A Workers rate limiting binding (`[[ratelimits]]` in wrangler.toml). */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Whether this client has used up its allowance, keyed by IP. Cloudflare
 * counts per location and approximately, so this stops one client or a
 * runaway loop, not a spread-out attack. Without a binding (tests, staging)
 * nothing is limited.
 */
export async function isRateLimited(
  limiter: RateLimiter | undefined,
  request: Request,
): Promise<boolean> {
  if (!limiter) return false;
  const key = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const { success } = await limiter.limit({ key });
  return !success;
}

export function tooManyRequests(what: string): Response {
  return Response.json(
    { error: `Too many ${what}, try again in a minute`, code: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': '60' } },
  );
}

/** Cloudflare's cache in this location; null outside the Workers runtime. */
export function edgeCache(): Cache | null {
  const storage = (globalThis as { caches?: { default?: Cache } }).caches;
  return storage?.default ?? null;
}
