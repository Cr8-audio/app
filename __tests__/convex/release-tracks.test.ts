import { RateLimitError } from '@cr8.audio/discogs-sdk';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, internal } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import schema from '@/convex/schema';

const modules = import.meta.glob('../../convex/**/*.*s');
type TestContext = ReturnType<typeof convexTest>;

/** A new user straight from Discogs sign-in: releases synced, no tracks. */
async function seedNewUser(t: TestContext, releaseIds: string[]) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', { username: 'newdigger' });
    await ctx.db.insert('user_music_connections', {
      userId,
      provider: 'discogs',
      accessToken: 'token',
      accessTokenSecret: 'secret',
      providerUserId: '42',
      providerUsername: 'NewDigger',
    });
    for (const releaseId of releaseIds) {
      await ctx.db.insert('discogs_releases', {
        discogs_release_id: releaseId,
        basic_release_data: {
          id: Number(releaseId),
          basic_information: { cover_image: `https://img/${releaseId}.jpg` },
        },
      });
      await ctx.db.insert('user_releases', {
        user_id: userId,
        discogs_release_id: releaseId,
      });
    }
    return userId;
  });
}

const RELEASES: Record<string, object> = {
  '100': {
    id: 100,
    artists: [{ name: 'Akufen' }],
    genres: ['Electronic'],
    styles: ['Microhouse'],
    tracklist: [
      { type_: 'track', position: 'A', title: 'Deck The House' },
      { type_: 'track', position: 'B', title: 'Skidoos' },
    ],
    videos: [
      {
        uri: 'https://www.youtube.com/watch?v=deckhouse01',
        title: 'Akufen - Deck The House',
      },
    ],
  },
};

function stubDiscogs(
  respond: (releaseId: string) => Response | Promise<never> = (releaseId) =>
    RELEASES[releaseId]
      ? Response.json(RELEASES[releaseId])
      : new Response('Release not found.', { status: 404 }),
) {
  const requested: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      const releaseId = String(url).split('/releases/')[1];
      requested.push(releaseId);
      return respond(releaseId);
    }),
  );
  return requested;
}

async function scheduled(t: TestContext) {
  return await t.run((ctx) =>
    ctx.db.system.query('_scheduled_functions').collect(),
  );
}

describe('importing tracklists for synced releases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('DISCOGS_CONSUMER_KEY', 'key');
    vi.stubEnv('DISCOGS_CONSUMER_SECRET', 'secret');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('gives a new user playable tracks from their collection', async () => {
    const t = convexTest(schema, modules);
    const userId = await seedNewUser(t, ['100', '404']);
    const requested = stubDiscogs();

    const result = await t.action(internal.releaseTracks.importReleaseTracks, {
      userId,
    });

    expect(result).toEqual({ imported: 2, failed: 0, more: false });
    expect(requested).toEqual(['100', '404']);
    const tracks = await t
      .withIdentity({ subject: userId })
      .query(api.tracks.getUserTracks);
    expect(
      tracks.map((track) => ({
        title: track.title,
        artist: track.artist,
        artwork: track.artwork,
        video: track.youtube_video_id,
      })),
    ).toEqual([
      {
        title: 'Deck The House',
        artist: 'Akufen',
        artwork: 'https://img/100.jpg',
        video: 'deckhouse01',
      },
      {
        title: 'Skidoos',
        artist: 'Akufen',
        artwork: 'https://img/100.jpg',
        video: undefined,
      },
    ]);

    // The deleted release is marked done so it isn't fetched again, and the
    // one release video is queued for a check without searching.
    const jobs = await scheduled(t);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      name: 'playlistAudio:matchTrackAudio',
      args: [{ searchMissing: false }],
    });
    expect(jobs[0].args[0].trackIds).toHaveLength(1);

    const again = await t.action(internal.releaseTracks.importReleaseTracks, {
      userId,
    });
    expect(again).toEqual({ imported: 0, failed: 0, more: false });
    expect(requested).toEqual(['100', '404']);
  });

  it('reuses tracks another owner of the release already has', async () => {
    const t = convexTest(schema, modules);
    const userId = await seedNewUser(t, ['100']);
    await t.run((ctx) =>
      ctx.db.insert('tracks', {
        id: 'existing',
        discogs_release_id: '100',
        title: 'Deck The House',
        artist: 'Akufen',
        position: 'A',
        duration: '',
      }),
    );
    const requested = stubDiscogs();

    await t.action(internal.releaseTracks.importReleaseTracks, { userId });

    expect(requested).toEqual([]);
  });

  it('backs off when Discogs rate limits, and gives up if it never clears', async () => {
    const t = convexTest(schema, modules);
    const userId = await seedNewUser(t, ['100']);
    stubDiscogs(() =>
      Promise.reject(
        new RateLimitError('Slow down', {
          limit: 60,
          used: 60,
          remaining: 0,
          retryAfterSeconds: 60,
        }),
      ),
    );

    const first = await t.action(internal.releaseTracks.importReleaseTracks, {
      userId,
    });
    expect(first).toEqual({ imported: 0, failed: 0, more: true });
    expect((await scheduled(t))[0]).toMatchObject({
      name: 'releaseTracks:importReleaseTracks',
      args: [{ userId, rateLimitedRuns: 1 }],
    });

    const last = await t.action(internal.releaseTracks.importReleaseTracks, {
      userId,
      rateLimitedRuns: 9,
    });
    expect(last.more).toBe(false);
  });
});

describe('verifying imported videos without searching', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('YOUTUBE_API_KEY', 'test-key');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('clears a wrong video and leaves tracks unchecked for a later search', async () => {
    const t = convexTest(schema, modules);
    const insert = (title: string, youtube_video_id?: string) =>
      t.run((ctx) =>
        ctx.db.insert('tracks', {
          id: title,
          discogs_release_id: '100',
          title,
          artist: 'Akufen',
          position: 'A',
          duration: '',
          youtube_video_id,
        }),
      );
    const good = await insert('Deck The House', 'deckhouse01');
    const wrong = await insert('Skidoos', 'recipe12345');
    const none = await insert('Jeep Sex');
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: URL) => {
        calls.push(url.pathname.split('/').pop()!);
        return Response.json({
          items: [
            {
              id: 'deckhouse01',
              snippet: { title: 'Akufen - Deck The House', categoryId: '10' },
              status: { embeddable: true },
            },
            {
              id: 'recipe12345',
              snippet: { title: 'Pickling recipe', categoryId: '26' },
              status: { embeddable: true },
            },
          ],
        });
      }),
    );

    await t.action(internal.playlistAudio.matchTrackAudio, {
      trackIds: [good, wrong, none],
      searchMissing: false,
    });

    expect(calls).toEqual(['videos']);
    const rows = await t.run(async (ctx) =>
      Promise.all(
        [good, wrong, none].map(async (id: Id<'tracks'>) => {
          const track = await ctx.db.get(id);
          return [
            track?.youtube_video_id ?? null,
            Boolean(track?.youtube_checked_at),
          ];
        }),
      ),
    );
    expect(rows).toEqual([
      ['deckhouse01', true],
      [null, false],
      [null, false],
    ]);
  });
});
