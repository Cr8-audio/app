interface RateLimitInfo {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  isLimited: boolean;
  remaining: number;
  reset: number;
}

function createRateLimiter(maxRequests: number = 60, timeWindow: number = 60) {
  const limits = new Map<string, RateLimitInfo>();

  function check(identifier: string): RateLimitResult {
    const now = Date.now();
    const info = limits.get(identifier);

    // If no previous requests or window expired
    if (!info || now > info.resetTime) {
      limits.set(identifier, {
        count: 1,
        resetTime: now + timeWindow * 1000,
      });

      return {
        isLimited: false,
        remaining: maxRequests - 1,
        reset: Math.floor((now + timeWindow * 1000) / 1000),
      };
    }

    // If within window and over limit
    if (info.count >= maxRequests) {
      return {
        isLimited: true,
        remaining: 0,
        reset: Math.floor(info.resetTime / 1000),
      };
    }

    // Increment counter
    info.count += 1;
    limits.set(identifier, info);

    return {
      isLimited: false,
      remaining: maxRequests - info.count,
      reset: Math.floor(info.resetTime / 1000),
    };
  }

  function cleanup() {
    const now = Date.now();
    Array.from(limits.entries()).forEach(([identifier, info]) => {
      if (now > info.resetTime) {
        limits.delete(identifier);
      }
    });
  }

  // Note: setInterval removed - not compatible with Cloudflare Workers global scope
  // Workers are stateless anyway, so in-memory rate limiting has limited effectiveness
  // Consider using Cloudflare Rate Limiting or Upstash Redis for production

  return { check, cleanup };
}

// Lazy-initialize to avoid Cloudflare Workers global scope restrictions
let _rateLimiter: ReturnType<typeof createRateLimiter> | null = null;

export function getRateLimiter() {
  if (!_rateLimiter) {
    _rateLimiter = createRateLimiter();
  }
  return _rateLimiter;
}

// Keep for backwards compatibility - but prefer getRateLimiter() in handlers
export const rateLimiter = {
  check: (identifier: string) => getRateLimiter().check(identifier),
  cleanup: () => getRateLimiter().cleanup(),
};
