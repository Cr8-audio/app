/**
 * Stand-in for the Workers runtime's `cloudflare:workers` module, which only
 * exists on Cloudflare. Tests set the bindings they need on `env`.
 */
export const env: Record<string, unknown> = {};
