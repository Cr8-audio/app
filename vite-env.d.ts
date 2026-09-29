/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'cloudflare:workers' {
  export const env: {
    readonly ENVIRONMENT?: string;
    readonly YOUTUBE_API_KEY?: string;
    // Per-client allowances for the YouTube routes (wrangler.toml).
    readonly YOUTUBE_SEARCH_LIMITER?: import('./lib/security/rateLimit').RateLimiter;
    readonly YOUTUBE_LOOKUP_LIMITER?: import('./lib/security/rateLimit').RateLimiter;
  };
}
