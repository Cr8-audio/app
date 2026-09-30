/**
 * Find a track's YouTube audio when a signed-in listener plays it, and save
 * it on the track.
 *
 * A browser that finds audio through /api/external/youtube keeps the answer
 * only for that visit, so the same track cost a search (100 of the default
 * 10,000 quota units a day) again and again. Here a track is searched for
 * once: the result, or the fact that nothing matched, is saved for every
 * later play by anyone who has the track.
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { action, internalQuery } from './_generated/server';
import { needsAudioCheck } from './lib/playlistSharing';
import {
  YouTubeApiError,
  checkYouTubeVideos,
  searchYouTubeTrack,
} from './lib/youtubeApi';

/**
 * - ready: play this video; the server has checked it against the track.
 * - no-match: the server searched and nothing matched confidently.
 * - quota: YouTube's quota is used up for now; nothing was saved.
 * - unhandled: not the server's to answer (not signed in, not a stored
 *   track, or no API key here), so the browser should look itself.
 */
export type ResolvedAudio =
  | { status: 'ready'; videoId: string }
  | { status: 'no-match' | 'quota' | 'unhandled' };

interface TrackToResolve {
  trackId: Id<'tracks'>;
  artist: string;
  title: string;
  videoId: string | null;
  needsCheck: boolean;
}

/** The app sends a Convex track ID or the old UUID kept in `tracks.id`. */
export const trackToResolve = internalQuery({
  args: { trackId: v.string() },
  handler: async (ctx, { trackId }): Promise<TrackToResolve | null> => {
    const convexId = ctx.db.normalizeId('tracks', trackId);
    const track = convexId
      ? await ctx.db.get(convexId)
      : await ctx.db
          .query('tracks')
          .withIndex('by_old_id', (q) => q.eq('id', trackId))
          .first();
    if (!track) return null;
    return {
      trackId: track._id,
      artist: track.artist,
      title: track.title,
      videoId: track.youtube_video_id ?? null,
      needsCheck: needsAudioCheck(track, Date.now()),
    };
  },
});

export const resolve = action({
  args: { trackId: v.string() },
  handler: async (ctx, { trackId }): Promise<ResolvedAudio> => {
    if (!(await getAuthUserId(ctx))) return { status: 'unhandled' };

    const track: TrackToResolve | null = await ctx.runQuery(
      internal.trackAudio.trackToResolve,
      { trackId },
    );
    if (!track) return { status: 'unhandled' };
    if (!track.needsCheck) {
      return track.videoId
        ? { status: 'ready', videoId: track.videoId }
        : { status: 'no-match' };
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return { status: 'unhandled' };

    let videoId: string | null = null;
    try {
      // A stored video costs 1 unit to check; only search when it fails.
      if (track.videoId) {
        const passed = await checkYouTubeVideos(apiKey, [
          { videoId: track.videoId, track },
        ]);
        if (passed.has(track.videoId)) videoId = track.videoId;
      }
      videoId ??= (await searchYouTubeTrack(apiKey, track))?.videoId ?? null;
    } catch (error) {
      if (error instanceof YouTubeApiError && error.isQuotaError) {
        return { status: 'quota' };
      }
      throw error;
    }

    await ctx.runMutation(internal.playlistAudio.saveTrackAudio, {
      checkedAt: Date.now(),
      results: [{ trackId: track.trackId, videoId }],
    });
    return videoId ? { status: 'ready', videoId } : { status: 'no-match' };
  },
});
