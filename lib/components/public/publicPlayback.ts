import { useMemo } from 'react';
import { ConvexHttpClient } from 'convex/browser';
import type { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import { usePlayerStore } from '@/lib/stores';
import type { CrateTrack } from '@/lib/types';

export type PublicPlaylist = NonNullable<
  FunctionReturnType<typeof api.playlists.getPublicPlaylist>
>;
export type PublicTrack = PublicPlaylist['tracks'][number];

/**
 * Fetch a shared playlist in a route loader, so the server-rendered page has
 * its title and artwork for link previews and the embed paints immediately.
 */
export async function loadPublicPlaylist(publicId: string) {
  const client = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);
  return await client.query(api.playlists.getPublicPlaylist, { publicId });
}

/** Tracks whose audio a listener can play without a YouTube search. */
export function isPlayable(track: PublicTrack) {
  return track.audio_status === 'ready' || track.audio_status === 'unverified';
}

/**
 * Playback for a shared playlist. Only tracks with audio go in the queue, so
 * listeners never spend YouTube search quota. The first play applies the
 * owner's play mode, and `loop` repeats the playlist.
 */
export function usePublicPlayback(
  playlist: PublicPlaylist | null | undefined,
  { loop }: { loop: boolean },
) {
  const playingTrackId = usePlayerStore((state) => state.playingTrackId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isShuffleEnabled = usePlayerStore((state) => state.isShuffleEnabled);
  const tracks = playlist?.tracks;

  const queue = useMemo(
    () => (tracks ?? []).filter(isPlayable) as CrateTrack[],
    [tracks],
  );
  const isActive = queue.some((track) => track.id === playingTrackId);

  const play = async (trackId?: string) => {
    if (!playlist || queue.length === 0) return false;
    const player = usePlayerStore.getState();

    if (!trackId && isActive && player.currentTrack) {
      return player.togglePlayPause(player.currentTrack);
    }

    const isQueued =
      player.queue.length === queue.length &&
      player.queue.every((track, index) => track.id === queue[index].id);
    const shuffle = isQueued
      ? player.isShuffleEnabled
      : playlist.playMode === 'shuffle';
    const index = trackId
      ? queue.findIndex((track) => track.id === trackId)
      : shuffle
        ? Math.floor(Math.random() * queue.length)
        : 0;
    if (index === -1) return false;

    if (!isQueued) {
      player.setShuffle(shuffle);
      player.setRepeat(loop);
      usePlayerStore.getState().setQueue(queue, index);
    }
    return usePlayerStore.getState().togglePlayPause(queue[index]);
  };

  return {
    queue,
    play,
    isActive,
    isPlaying: isActive && isPlaying,
    playingTrackId: isActive ? playingTrackId : null,
    isShuffleEnabled,
    toggleShuffle: () => usePlayerStore.getState().toggleShuffle(),
    playNext: () => usePlayerStore.getState().playNext(),
    playPrevious: () => usePlayerStore.getState().playPrevious(),
  };
}
