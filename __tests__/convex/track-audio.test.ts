import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import schema from '@/convex/schema';

const modules = import.meta.glob('../../convex/**/*.*s');
type TestContext = ReturnType<typeof convexTest>;

async function seedTrack(
  t: TestContext,
  values: { title: string; youtube_video_id?: string; checkedAt?: number },
) {
  return await t.run(async (ctx) =>
    ctx.db.insert('tracks', {
      id: `old-${values.title}`,
      discogs_release_id: 'release-1',
      title: values.title,
      artist: 'Akufen',
      position: 'A1',
      duration: '6:10',
      youtube_video_id: values.youtube_video_id,
      youtube_checked_at: values.checkedAt,
    }),
  );
}

/** A fake YouTube Data API: videos.list knows `videos`, search.list `searches`. */
function stubYouTube({
  videos = {},
  searches = {},
  searchStatus = 200,
}: {
  videos?: Record<string, string>;
  searches?: Record<string, string>;
  searchStatus?: number;
}) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL) => {
      const endpoint = url.pathname.split('/').pop()!;
      calls.push(endpoint);
      if (endpoint === 'videos') {
        const ids = url.searchParams.get('id')!.split(',');
        return Response.json({
          items: ids
            .filter((id) => videos[id])
            .map((id) => ({
              id,
              snippet: { title: videos[id], categoryId: '10' },
              status: { embeddable: true },
            })),
        });
      }
      if (searchStatus !== 200) {
        return Response.json(
          { error: { message: 'quotaExceeded' } },
          { status: searchStatus },
        );
      }
      const query = url.searchParams.get('q')!;
      const title = Object.keys(searches).find((key) => query.includes(key));
      return Response.json({
        items: title
          ? [
              {
                id: { videoId: searches[title] },
                snippet: { title: `Akufen - ${title}` },
              },
            ]
          : [],
      });
    }),
  );
  return calls;
}

async function savedAudio(t: TestContext, trackId: Id<'tracks'>) {
  return await t.run(async (ctx) => {
    const track = await ctx.db.get(trackId);
    return {
      videoId: track?.youtube_video_id,
      checked: Boolean(track?.youtube_checked_at),
    };
  });
}

/** A signed-in listener. */
async function listener(t: TestContext) {
  const userId = await t.run((ctx) =>
    ctx.db.insert('users', { username: 'paprika' }),
  );
  return t.withIdentity({ subject: userId });
}

describe('finding audio when a track is played', () => {
  beforeEach(() => {
    vi.stubEnv('YOUTUBE_API_KEY', 'test-key');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('searches once, saves the video, and answers from the track after that', async () => {
    const t = convexTest(schema, modules);
    const me = await listener(t);
    const trackId = await seedTrack(t, { title: 'Jeep Sex' });
    const calls = stubYouTube({ searches: { 'Jeep Sex': 'jeep' } });

    const first = await me.action(api.trackAudio.resolve, { trackId });
    expect(first).toEqual({ status: 'ready', videoId: 'jeep' });
    expect(await savedAudio(t, trackId)).toEqual({
      videoId: 'jeep',
      checked: true,
    });

    // The next play, by anyone, costs nothing.
    const someoneElse = await listener(t);
    expect(
      await someoneElse.action(api.trackAudio.resolve, { trackId }),
    ).toEqual(first);
    expect(calls).toEqual(['search']);
  });

  it('keeps a stored video that matches, for one unit instead of a search', async () => {
    const t = convexTest(schema, modules);
    const me = await listener(t);
    const trackId = await seedTrack(t, {
      title: 'Deck The House',
      youtube_video_id: 'good',
    });
    const calls = stubYouTube({ videos: { good: 'Akufen - Deck The House' } });

    expect(await me.action(api.trackAudio.resolve, { trackId })).toEqual({
      status: 'ready',
      videoId: 'good',
    });
    expect(calls).toEqual(['videos']);
    expect(await savedAudio(t, trackId)).toEqual({
      videoId: 'good',
      checked: true,
    });
  });

  it('replaces a stored video that is not the track', async () => {
    const t = convexTest(schema, modules);
    const me = await listener(t);
    const trackId = await seedTrack(t, {
      title: 'Skidoos',
      youtube_video_id: 'recipe',
    });
    const calls = stubYouTube({
      videos: { recipe: 'Pickling recipe' },
      searches: { Skidoos: 'skidoos' },
    });

    expect(await me.action(api.trackAudio.resolve, { trackId })).toEqual({
      status: 'ready',
      videoId: 'skidoos',
    });
    expect(calls).toEqual(['videos', 'search']);
  });

  it('remembers that nothing matched, so it is not searched again', async () => {
    const t = convexTest(schema, modules);
    const me = await listener(t);
    const trackId = await seedTrack(t, { title: 'Wet Floor' });
    const calls = stubYouTube({});

    const resolve = () => me.action(api.trackAudio.resolve, { trackId });
    expect(await resolve()).toEqual({ status: 'no-match' });
    expect(await resolve()).toEqual({ status: 'no-match' });
    expect(calls).toEqual(['search']);
    expect(await savedAudio(t, trackId)).toEqual({
      videoId: undefined,
      checked: true,
    });
  });

  it('saves nothing when the quota is used up, so a later play tries again', async () => {
    const t = convexTest(schema, modules);
    const me = await listener(t);
    const trackId = await seedTrack(t, { title: 'Jeep Sex' });
    stubYouTube({ searchStatus: 403 });

    expect(await me.action(api.trackAudio.resolve, { trackId })).toEqual({
      status: 'quota',
    });
    expect(await savedAudio(t, trackId)).toEqual({
      videoId: undefined,
      checked: false,
    });
  });

  it('finds the track by the old ID the library sends', async () => {
    const t = convexTest(schema, modules);
    const me = await listener(t);
    await seedTrack(t, {
      title: 'My Way',
      youtube_video_id: 'verified',
      checkedAt: 1,
    });
    const calls = stubYouTube({});

    expect(
      await me.action(api.trackAudio.resolve, { trackId: 'old-My Way' }),
    ).toEqual({ status: 'ready', videoId: 'verified' });
    expect(calls).toEqual([]);
  });

  it('leaves it to the browser without a sign-in, a stored track or an API key', async () => {
    const t = convexTest(schema, modules);
    const me = await listener(t);
    const trackId = await seedTrack(t, { title: 'Jeep Sex' });
    const calls = stubYouTube({ searches: { 'Jeep Sex': 'jeep' } });
    const unhandled = { status: 'unhandled' };

    expect(await t.action(api.trackAudio.resolve, { trackId })).toEqual(
      unhandled,
    );
    expect(
      await me.action(api.trackAudio.resolve, { trackId: 'external_123' }),
    ).toEqual(unhandled);
    vi.stubEnv('YOUTUBE_API_KEY', '');
    expect(await me.action(api.trackAudio.resolve, { trackId })).toEqual(
      unhandled,
    );

    expect(calls).toEqual([]);
    expect(await savedAudio(t, trackId)).toEqual({
      videoId: undefined,
      checked: false,
    });
  });
});
