/**
 * Match YouTube audio for shared playlists on the server.
 *
 * Browsers find audio through /api/external/youtube, which spends the
 * YouTube quota (search costs 100 of the default 10,000 units a day) on every
 * visit. Shared playlists get their audio matched here once instead, and the
 * result is saved on the track, so listeners on a public page or an embed
 * play verified videos without any API call.
 */
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { needsAudioCheck } from './lib/playlistSharing';
import {
  MAX_VIDEOS_PER_LOOKUP,
  YouTubeApiError,
  checkYouTubeVideos,
  searchYouTubeTrack,
} from './lib/youtubeApi';

/** Searches per run: 20 × 100 units keeps one run well inside the quota. */
export const MAX_SEARCHES_PER_RUN = 20;
const NEXT_BATCH_DELAY_MS = 10 * 60 * 1000;
const QUOTA_RETRY_DELAY_MS = 6 * 60 * 60 * 1000;
/** Quota failures in a row before giving up; continuing a batch is free. */
const MAX_QUOTA_ATTEMPTS = 4;

interface TrackNeedingAudio {
  trackId: Id<'tracks'>;
  artist: string;
  title: string;
  videoId: string | null;
}

/** The tracks among `trackIds` that still need their audio checked. */
export const tracksNeedingAudio = internalQuery({
  args: { trackIds: v.array(v.id('tracks')) },
  handler: async (ctx, { trackIds }) => {
    const now = Date.now();
    const tracks = await Promise.all(
      [...new Set(trackIds)].map((trackId) => ctx.db.get(trackId)),
    );
    return tracks.flatMap((track) =>
      track && needsAudioCheck(track, now)
        ? [
            {
              trackId: track._id,
              artist: track.artist,
              title: track.title,
              videoId: track.youtube_video_id ?? null,
            },
          ]
        : [],
    );
  },
});

export const saveTrackAudio = internalMutation({
  args: {
    checkedAt: v.number(),
    results: v.array(
      v.object({
        trackId: v.id('tracks'),
        videoId: v.union(v.string(), v.null()),
      }),
    ),
  },
  handler: async (ctx, { checkedAt, results }) => {
    for (const { trackId, videoId } of results) {
      if (!(await ctx.db.get(trackId))) continue;
      await ctx.db.patch(trackId, {
        youtube_video_id: videoId ?? undefined,
        youtube_checked_at: checkedAt,
      });
    }
  },
});

/**
 * Verify stored videos (one cheap batched call), then search for the tracks
 * that have none, a limited number per run. The rest continue in a later run.
 */
export const matchTrackAudio = internalAction({
  args: {
    trackIds: v.array(v.id('tracks')),
    attempt: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { trackIds, attempt = 1 },
  ): Promise<{ matched: number; remaining: number }> => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.warn(
        'YOUTUBE_API_KEY is not set on this Convex deployment; shared playlists fall back to matching audio in the browser.',
      );
      return { matched: 0, remaining: trackIds.length };
    }

    const tracks: TrackNeedingAudio[] = await ctx.runQuery(
      internal.playlistAudio.tracksNeedingAudio,
      {
        trackIds,
      },
    );
    if (tracks.length === 0) return { matched: 0, remaining: 0 };

    const checkedAt = Date.now();
    const results: Array<{ trackId: Id<'tracks'>; videoId: string | null }> =
      [];
    const toSearch: TrackNeedingAudio[] = [];
    let retry: { afterMs: number; attempt: number } | null = null;

    try {
      const withVideo = tracks.filter((track) => track.videoId);
      for (let i = 0; i < withVideo.length; i += MAX_VIDEOS_PER_LOOKUP) {
        const batch = withVideo.slice(i, i + MAX_VIDEOS_PER_LOOKUP);
        const passed = await checkYouTubeVideos(
          apiKey,
          batch.map((track) => ({ videoId: track.videoId!, track })),
        );
        for (const track of batch) {
          if (passed.has(track.videoId!)) {
            results.push({ trackId: track.trackId, videoId: track.videoId });
          } else {
            toSearch.push(track);
          }
        }
      }
      toSearch.push(...tracks.filter((track) => !track.videoId));

      for (const track of toSearch.slice(0, MAX_SEARCHES_PER_RUN)) {
        const match = await searchYouTubeTrack(apiKey, track);
        results.push({
          trackId: track.trackId,
          videoId: match?.videoId ?? null,
        });
      }
      if (toSearch.length > MAX_SEARCHES_PER_RUN) {
        retry = { afterMs: NEXT_BATCH_DELAY_MS, attempt: 1 };
      }
    } catch (error) {
      if (error instanceof YouTubeApiError && error.isQuotaError) {
        console.warn(
          'YouTube quota unavailable; retrying audio matching later',
        );
        retry =
          attempt < MAX_QUOTA_ATTEMPTS
            ? { afterMs: QUOTA_RETRY_DELAY_MS, attempt: attempt + 1 }
            : null;
      } else {
        console.error('Audio matching failed', error);
      }
    }

    if (results.length > 0) {
      await ctx.runMutation(internal.playlistAudio.saveTrackAudio, {
        checkedAt,
        results,
      });
    }

    const done = new Set(results.map((result) => result.trackId));
    const remaining = tracks
      .map((track) => track.trackId)
      .filter((trackId) => !done.has(trackId));
    if (retry && remaining.length > 0) {
      await ctx.scheduler.runAfter(
        retry.afterMs,
        internal.playlistAudio.matchTrackAudio,
        {
          trackIds: remaining,
          attempt: retry.attempt,
        },
      );
    }

    return {
      matched: results.filter((result) => result.videoId).length,
      remaining: remaining.length,
    };
  },
});
