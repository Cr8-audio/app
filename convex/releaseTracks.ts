/**
 * Import tracklists for a user's synced releases.
 *
 * Collection sync stores a summary of each release. The tracks the library
 * lists, the player plays and playlists hold come from each release's full
 * record, fetched here after every sync. A release is fetched once: its
 * tracks are shared by everyone who owns it. Discogs allows 60 signed
 * requests a minute, so releases are fetched in small batches.
 *
 * Tracks start with the release's own YouTube video where one matches the
 * title. Those are verified in bulk (1 quota unit per 50) without searching;
 * searching stays on demand, when a track is played or shared.
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import { isRateLimitError } from '@cr8.audio/discogs-sdk';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
  type QueryCtx,
} from './_generated/server';
import { resolveCollectionOwnerKey } from './discogsCollection';
import { fetchDiscogsRelease } from './lib/discogsClient';
import { importMinutesLeft } from './lib/importEstimate';
import { tracksFromRelease } from './lib/discogsTracklist';

// About 30 records a minute; keep lib/importEstimate.ts in step.
export const RELEASES_PER_RUN = 25;
const NEXT_BATCH_DELAY_MS = 30_000;
const RATE_LIMIT_RETRY_MS = 60_000;
/** Rate-limited runs in a row with no progress before giving up. */
const MAX_RATE_LIMITED_RUNS = 10;

/** Stored release IDs are strings, but some migrated rows used numbers. */
function releaseIdForms(releaseId: string | number): Array<string | number> {
  const asNumber = Number(releaseId);
  return Number.isNaN(asNumber)
    ? [String(releaseId)]
    : [String(releaseId), asNumber];
}

async function hasTracks(
  ctx: Pick<QueryCtx, 'db'>,
  releaseId: string | number,
) {
  for (const id of releaseIdForms(releaseId)) {
    const track = await ctx.db
      .query('tracks')
      .withIndex('by_discogs_release', (q) => q.eq('discogs_release_id', id))
      .first();
    if (track) return true;
  }
  return false;
}

async function releaseRow(
  ctx: Pick<QueryCtx, 'db'>,
  releaseId: string | number,
) {
  for (const id of releaseIdForms(releaseId)) {
    const release = await ctx.db
      .query('discogs_releases')
      .withIndex('by_discogs_id', (q) => q.eq('discogs_release_id', id))
      .first();
    if (release) return release;
  }
  return null;
}

/**
 * Walk a user's collection for releases whose tracklist hasn't been imported,
 * stopping after `limit` of them.
 */
async function scanCollection(
  ctx: Pick<QueryCtx, 'db'>,
  userId: Id<'users'>,
  limit: number,
) {
  const user = await ctx.db.get(userId);
  if (!user) return { total: 0, needed: [] };
  const ownerKey = await resolveCollectionOwnerKey(ctx, user);
  const owned = await ctx.db
    .query('user_releases')
    .withIndex('by_user', (q) => q.eq('user_id', ownerKey))
    .collect();

  const needed: Array<{ releaseId: string; artwork?: string }> = [];
  for (const { discogs_release_id: releaseId } of owned) {
    if (needed.length >= limit) break;
    if (await hasTracks(ctx, releaseId)) continue;
    const release = await releaseRow(ctx, releaseId);
    if (release?.tracklist_checked_at) continue;
    const cover = release?.basic_release_data?.basic_information?.cover_image;
    needed.push({
      releaseId: String(releaseId),
      ...(typeof cover === 'string' && cover ? { artwork: cover } : {}),
    });
  }
  return { total: owned.length, needed };
}

/** Releases in a user's collection whose tracklist hasn't been imported. */
export const releasesNeedingTracks = internalQuery({
  args: { userId: v.id('users'), limit: v.number() },
  handler: async (ctx, { userId, limit }) =>
    (await scanCollection(ctx, userId, limit)).needed,
});

/**
 * How many of the signed-in user's records have their tracks yet, and about
 * how long the rest will take, so onboarding and the library can say so
 * instead of looking empty. `syncing` means the collection itself is still
 * being read, so `total` will grow.
 */
export const getTracklistProgress = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const { total, needed } = await scanCollection(ctx, userId, Infinity);
    const connection = await ctx.db
      .query('user_music_connections')
      .withIndex('by_user_provider', (q) =>
        q.eq('userId', userId).eq('provider', 'discogs'),
      )
      .first();
    return {
      total,
      ready: total - needed.length,
      minutesLeft: importMinutesLeft(needed.length),
      syncing: connection?.syncStatus === 'syncing',
    };
  },
});

const vTrackRow = v.object({
  title: v.string(),
  artist: v.string(),
  extra_artists: v.optional(v.string()),
  position: v.string(),
  duration: v.string(),
  genres: v.optional(v.string()),
  styles: v.optional(v.string()),
  artwork: v.optional(v.string()),
  youtube_video_id: v.optional(v.string()),
});

/**
 * Save one release's tracks, unless another import got there first. Returns
 * the new tracks that came with a video, for verification.
 */
export const saveReleaseTracks = internalMutation({
  args: { releaseId: v.string(), tracks: v.array(vTrackRow) },
  handler: async (ctx, { releaseId, tracks }) => {
    const release = await releaseRow(ctx, releaseId);
    if (release) {
      await ctx.db.patch(release._id, { tracklist_checked_at: Date.now() });
    }
    if (await hasTracks(ctx, releaseId)) return [];

    const now = new Date().toISOString();
    const withVideo: Id<'tracks'>[] = [];
    for (const track of tracks) {
      const trackId = await ctx.db.insert('tracks', {
        id: crypto.randomUUID(),
        discogs_release_id: releaseId,
        ...track,
        created_at: now,
      });
      if (track.youtube_video_id) withVideo.push(trackId);
    }
    return withVideo;
  },
});

/**
 * Import the next batch of missing tracklists for a user, then schedule the
 * next batch while there's progress to make.
 */
export const importReleaseTracks = internalAction({
  args: { userId: v.id('users'), rateLimitedRuns: v.optional(v.number()) },
  handler: async (
    ctx,
    { userId, rateLimitedRuns = 0 },
  ): Promise<{ imported: number; failed: number; more: boolean }> => {
    const credentials = await ctx.runQuery(internal.discogs.getCredentials, {
      userId,
    });
    if (!credentials) return { imported: 0, failed: 0, more: false };

    const releases: Array<{ releaseId: string; artwork?: string }> =
      await ctx.runQuery(internal.releaseTracks.releasesNeedingTracks, {
        userId,
        limit: RELEASES_PER_RUN,
      });

    let imported = 0;
    let failed = 0;
    let rateLimited = false;
    const toVerify: Id<'tracks'>[] = [];
    for (const { releaseId, artwork } of releases) {
      try {
        const release = await fetchDiscogsRelease(credentials, releaseId);
        const withVideo: Id<'tracks'>[] = await ctx.runMutation(
          internal.releaseTracks.saveReleaseTracks,
          {
            releaseId,
            // A release Discogs no longer has is marked done with no tracks.
            tracks: release ? tracksFromRelease(release, artwork) : [],
          },
        );
        toVerify.push(...withVideo);
        imported++;
      } catch (error) {
        if (isRateLimitError(error)) {
          rateLimited = true;
          break;
        }
        failed++;
        console.error(`Couldn't import tracks for release ${releaseId}`, error);
      }
    }

    if (toVerify.length > 0) {
      await ctx.scheduler.runAfter(0, internal.playlistAudio.matchTrackAudio, {
        trackIds: toVerify,
        searchMissing: false,
      });
    }

    // Keep going while there's more and this run made progress. A batch
    // that all fails stops here, and so does being rate limited run after
    // run, instead of retrying forever.
    const stalledRuns = rateLimited && imported === 0 ? rateLimitedRuns + 1 : 0;
    const more = rateLimited
      ? stalledRuns < MAX_RATE_LIMITED_RUNS
      : releases.length === RELEASES_PER_RUN && imported > 0;
    if (more) {
      await ctx.scheduler.runAfter(
        rateLimited ? RATE_LIMIT_RETRY_MS : NEXT_BATCH_DELAY_MS,
        internal.releaseTracks.importReleaseTracks,
        { userId, rateLimitedRuns: stalledRuns },
      );
    }
    return { imported, failed, more };
  },
});
