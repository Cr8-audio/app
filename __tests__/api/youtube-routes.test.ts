import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route as LookupRoute } from '@/app/api/external/youtube/$videoId';
import { Route as SearchRoute } from '@/app/api/external/youtube/search';

type Handler = (ctx: {
  request: Request;
  params: Record<string, string>;
}) => Promise<Response>;

function handler(route: { options: { server?: unknown } }): Handler {
  const server = route.options.server as { handlers: { GET: Handler } };
  return server.handlers.GET;
}

const bindings = env as Record<string, unknown>;

/** A rate limiter that allows `allowed` calls, then refuses. */
function limiter(allowed: number) {
  let used = 0;
  return { limit: vi.fn(async () => ({ success: used++ < allowed })) };
}

/** Cloudflare's per-location cache, as a map. */
function edgeCache() {
  const stored = new Map<string, Response>();
  return {
    match: vi.fn(async (request: Request) => stored.get(request.url)?.clone()),
    put: vi.fn(async (request: Request, response: Response) => {
      stored.set(request.url, response);
    }),
  };
}

function youtubeReturns(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const SEARCH_RESULTS = {
  items: [
    {
      id: { videoId: 'dQw4w9WgXcQ' },
      snippet: { title: 'Akufen - Deck The House', channelTitle: 'Akufen' },
    },
  ],
};

function search(query: string, ip = '203.0.113.7') {
  return handler(SearchRoute)({
    request: new Request(
      `https://cr8.audio/api/external/youtube/search?q=${encodeURIComponent(query)}`,
      { headers: { 'cf-connecting-ip': ip } },
    ),
    params: {},
  });
}

describe('YouTube search route', () => {
  beforeEach(() => {
    bindings.YOUTUBE_API_KEY = 'key';
  });
  afterEach(() => {
    for (const name of Object.keys(bindings)) delete bindings[name];
    vi.unstubAllGlobals();
  });

  it('answers a repeat search from the edge without spending quota', async () => {
    const fetchMock = youtubeReturns(SEARCH_RESULTS);
    const searchLimiter = limiter(10);
    bindings.YOUTUBE_SEARCH_LIMITER = searchLimiter;
    vi.stubGlobal('caches', { default: edgeCache() });

    const first = await search('akufen deck the house');
    const second = await search('akufen deck the house');

    expect(await first.json()).toMatchObject({ videoId: 'dQw4w9WgXcQ' });
    expect(await second.json()).toMatchObject({ videoId: 'dQw4w9WgXcQ' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(searchLimiter.limit).toHaveBeenCalledTimes(1);
  });

  it('remembers "no match" too, since a miss costs a search', async () => {
    const fetchMock = youtubeReturns({ items: [] });
    vi.stubGlobal('caches', { default: edgeCache() });

    expect((await search('nothing like this')).status).toBe(404);
    expect((await search('nothing like this')).status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not keep upstream failures', async () => {
    const fetchMock = youtubeReturns({ error: { message: 'quota' } }, 403);
    vi.stubGlobal('caches', { default: edgeCache() });

    expect((await search('akufen')).status).toBe(502);
    expect((await search('akufen')).status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('turns a client away once it has used its allowance', async () => {
    const fetchMock = youtubeReturns(SEARCH_RESULTS);
    const searchLimiter = limiter(1);
    bindings.YOUTUBE_SEARCH_LIMITER = searchLimiter;

    expect((await search('first', '198.51.100.1')).status).toBe(200);
    const refused = await search('second', '198.51.100.1');

    expect(refused.status).toBe(429);
    expect(refused.headers.get('Retry-After')).toBe('60');
    expect(await refused.json()).toMatchObject({ code: 'RATE_LIMITED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(searchLimiter.limit).toHaveBeenCalledWith({ key: '198.51.100.1' });
  });

  it('still searches where there is no limiter or cache (local dev)', async () => {
    youtubeReturns(SEARCH_RESULTS);

    expect((await search('akufen')).status).toBe(200);
  });
});

describe('YouTube video lookup route', () => {
  afterEach(() => {
    for (const name of Object.keys(bindings)) delete bindings[name];
    vi.unstubAllGlobals();
  });

  it('turns a client away once it has used its allowance', async () => {
    bindings.YOUTUBE_API_KEY = 'key';
    bindings.YOUTUBE_LOOKUP_LIMITER = limiter(0);
    const fetchMock = youtubeReturns({ items: [] });

    const response = await handler(LookupRoute)({
      request: new Request(
        'https://cr8.audio/api/external/youtube/dQw4w9WgXcQ',
        { headers: { 'cf-connecting-ip': '203.0.113.7' } },
      ),
      params: { videoId: 'dQw4w9WgXcQ' },
    });

    expect(response.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
