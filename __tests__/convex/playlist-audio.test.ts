import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { internal } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import schema from '@/convex/schema';

const modules = import.meta.glob('../../convex/**/*.*s');
type TestContext = ReturnType<typeof convexTest>;

async function seedTrack(
  t: TestContext,
  values: { title: string; youtube_video_id?: string; checked?: boolean },
) {
  return await t.run(async (ctx) =>
    ctx.db.insert('tracks', {
      id: values.title,
      discogs_release_id: 'release-1',
      title: values.title,
      artist: 'Akufen',
      position: 'A1',
      duration: '6:10',
      youtube_video_id: values.youtube_video_id,
      youtube_checked_at: values.checked ? 1 : undefined,
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

async function trackAudio(t: TestContext, trackId: Id<'tracks'>) {
  return await t.run(async (ctx) => {
    const track = await ctx.db.get(trackId);
    return {
      videoId: track?.youtube_video_id,
      checked: Boolean(track?.youtube_checked_at),
    };
  });
}

describe('matching audio for shared playlists', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('YOUTUBE_API_KEY', 'test-key');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('verifies stored videos, replaces wrong ones and records misses', async () => {
    const t = convexTest(schema, modules);
    const good = await seedTrack(t, {
      title: 'Deck The House',
      youtube_video_id: 'good',
    });
    const wrong = await seedTrack(t, {
      title: 'Skidoos',
      youtube_video_id: 'recipe',
    });
    const missing = await seedTrack(t, { title: 'Jeep Sex' });
    const nowhere = await seedTrack(t, { title: 'Wet Floor' });
    const verified = await seedTrack(t, {
      title: 'My Way',
      youtube_video_id: 'verified',
      checked: true,
    });
    const calls = stubYouTube({
      videos: { good: 'Akufen - Deck The House', recipe: 'Pickling recipe' },
      searches: { Skidoos: 'skidoos', 'Jeep Sex': 'jeep' },
    });

    const result = await t.action(internal.playlistAudio.matchTrackAudio, {
      trackIds: [good, wrong, missing, nowhere, verified],
    });

    expect(result).toEqual({ matched: 3, remaining: 0 });
    // One batched lookup for the stored videos, then one search per miss;
    // the already-verified track costs nothing.
    expect(calls).toEqual(['videos', 'search', 'search', 'search']);
    expect(await trackAudio(t, good)).toEqual({
      videoId: 'good',
      checked: true,
    });
    expect(await trackAudio(t, wrong)).toEqual({
      videoId: 'skidoos',
      checked: true,
    });
    expect(await trackAudio(t, missing)).toEqual({
      videoId: 'jeep',
      checked: true,
    });
    expect(await trackAudio(t, nowhere)).toEqual({
      videoId: undefined,
      checked: true,
    });
  });

  it('keeps what it matched and retries later when the quota runs out', async () => {
    const t = convexTest(schema, modules);
    const good = await seedTrack(t, {
      title: 'Deck The House',
      youtube_video_id: 'good',
    });
    const missing = await seedTrack(t, { title: 'Jeep Sex' });
    stubYouTube({
      videos: { good: 'Akufen - Deck The House' },
      searchStatus: 403,
    });

    const result = await t.action(internal.playlistAudio.matchTrackAudio, {
      trackIds: [good, missing],
    });

    expect(result).toEqual({ matched: 1, remaining: 1 });
    expect(await trackAudio(t, good)).toEqual({
      videoId: 'good',
      checked: true,
    });
    expect(await trackAudio(t, missing)).toEqual({
      videoId: undefined,
      checked: false,
    });
    const scheduled = await t.run(async (ctx) =>
      ctx.db.system.query('_scheduled_functions').collect(),
    );
    expect(scheduled[0]).toMatchObject({
      name: 'playlistAudio:matchTrackAudio',
      args: [{ trackIds: [missing], attempt: 2 }],
    });
  });

  it('does nothing without a YouTube key', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '');
    const t = convexTest(schema, modules);
    const missing = await seedTrack(t, { title: 'Jeep Sex' });
    const calls = stubYouTube({});

    await t.action(internal.playlistAudio.matchTrackAudio, {
      trackIds: [missing],
    });

    expect(calls).toEqual([]);
    expect(await trackAudio(t, missing)).toEqual({
      videoId: undefined,
      checked: false,
    });
  });
});
