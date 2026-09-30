import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api } from '@/convex/_generated/api';
import schema from '@/convex/schema';

const modules = import.meta.glob('../../convex/**/*.*s');

/** Two records in my collection, and one in someone else's. */
async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', { username: 'paprika' });
    await ctx.db.insert('user_releases', {
      user_id: userId,
      discogs_release_id: '1',
    });
    await ctx.db.insert('user_releases', {
      user_id: userId,
      discogs_release_id: '2',
    });
    await ctx.db.insert('user_releases', {
      user_id: 'someone-else',
      discogs_release_id: '3',
    });
    const track = (
      release: string,
      title: string,
      audio: { youtube_video_id?: string; youtube_checked_at?: number } = {},
    ) =>
      ctx.db.insert('tracks', {
        id: `old-${title}`,
        discogs_release_id: release,
        title,
        artist: 'Dego',
        position: 'A1',
        duration: '3:17',
        styles: 'Broken Beat',
        ...audio,
      });
    await track('1', 'The Negative Positive', {
      youtube_video_id: 'abc',
      youtube_checked_at: 1,
    });
    await track('1', 'The Disclaimer', { youtube_video_id: 'def' });
    await track('2', 'She Is Virgo');
    await track('3', 'Not Mine');
    return userId;
  });
}

describe('the library queue', () => {
  it('lists my whole library in table order with what the player needs', async () => {
    const t = convexTest(schema, modules);
    const userId = await seed(t);
    const me = t.withIdentity({ subject: userId });

    const queue = await me.query(api.tracks.listLibraryQueue, {
      sortBy: 'title',
    });
    expect(queue.map((track) => [track.title, track.audio_status])).toEqual([
      ['She Is Virgo', 'pending'],
      ['The Disclaimer', 'unverified'],
      ['The Negative Positive', 'ready'],
    ]);
    expect(queue[2]).toEqual({
      id: 'old-The Negative Positive',
      discogs_release_id: '1',
      youtube_video_id: 'abc',
      title: 'The Negative Positive',
      artist: 'Dego',
      duration: '3:17',
      genres: null,
      artwork: null,
      audio_status: 'ready',
    });
  });

  it('matches the search the table is showing', async () => {
    const t = convexTest(schema, modules);
    const userId = await seed(t);
    const me = t.withIdentity({ subject: userId });

    const queue = await me.query(api.tracks.listLibraryQueue, {
      search: 'virgo',
    });
    expect(queue.map((track) => track.title)).toEqual(['She Is Virgo']);
  });

  it('is empty for someone who is not signed in', async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    expect(await t.query(api.tracks.listLibraryQueue, {})).toEqual([]);
  });
});
