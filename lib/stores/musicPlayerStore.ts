import { create } from 'zustand';
import type {
  YouTubePlayer as YTPlayer,
  YouTubeEvent,
  CrateTrack,
} from '@/lib/types';
import {
  searchTrackVideo,
  validateTrackVideo,
} from '@/lib/api-clients/youtube/service';
import {
  createPlayOrder,
  nextPosition,
  nextShuffleCycle,
  previousPosition,
  removeFromOrder,
  type KeyOf,
} from '@/lib/player/playOrder';

const YOUTUBE_IFRAME_API_URL = 'https://www.youtube.com/iframe_api';
const YOUTUBE_PLAYER_ID = 'youtube-player';
const YOUTUBE_SCRIPT_ID = 'youtube-iframe-api';

let youtubeApiPromise: Promise<void> | null = null;
let playerInitializationPromise: Promise<void> | null = null;
let playbackRequestId = 0;
let videoHost: HTMLElement | null = null;

/** Past this point in a track, "previous" restarts it, as players do. */
const RESTART_AFTER_SECONDS = 3;
/** How many tracks "next" will pass over looking for one with audio. */
const MAX_TRACKS_TRIED = 10;

const resolvedVideoIds = new Map<string, string>();
const videoResolutionPromises = new Map<string, Promise<string | null>>();
const validatedVideoIds = new Map<string, string>();
const videoValidationPromises = new Map<string, Promise<boolean>>();

interface PlayerState {
  player: YTPlayer | null;
  isReady: boolean;
  isPlaying: boolean;
  playingTrackId: string | null;
  currentTrack: CrateTrack | null;
  /** The list being played through: a playlist, a record, the library. */
  queue: CrateTrack[];
  currentIndex: number;
  /** Tracks the listener queued. They play next, then `queue` carries on. */
  upNext: CrateTrack[];
  /** The current track came from `upNext`, so it has no place in the order. */
  isPlayingUpNext: boolean;
  /** Why "next" or "previous" last gave up; a new object each time. */
  playbackIssue: { reason: 'no-audio' | 'unavailable' } | null;
  isShuffleEnabled: boolean;
  isRepeatEnabled: boolean;
  /** Queue indices in play order; see lib/player/playOrder. */
  playOrder: number[];
  orderPosition: number;
  volume: number;

  // Progress tracking
  currentTime: number;
  duration: number;
  timeUpdateInterval: NodeJS.Timeout | null;

  // Core player actions
  initializePlayer: () => Promise<void>;
  setPlayer: (player: YTPlayer) => void;
  setIsReady: (ready: boolean) => void;
  setPlayingTrackId: (trackId: string | null) => void;
  playTrack: (track: CrateTrack) => Promise<boolean>;
  pauseTrack: () => void;
  togglePlayPause: (track: CrateTrack) => Promise<boolean>;

  // Queue management
  setQueue: (tracks: CrateTrack[], startIndex?: number) => void;
  addToQueue: (track: CrateTrack) => void;
  playUpNext: (trackId: string) => Promise<boolean>;
  removeFromUpNext: (trackId: string) => void;
  clearUpNext: () => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;

  // Playback controls
  playNext: () => Promise<boolean>;
  playPrevious: () => Promise<boolean>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setShuffle: (enabled: boolean) => void;
  setRepeat: (enabled: boolean) => void;
  setVolume: (volume: number) => void;

  // Progress controls
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  seekTo: (time: number) => void;
  startTimeTracking: () => void;
  stopTimeTracking: () => void;

  // Utilities
  reset: () => void;
}

/** Shuffle keeps tracks from the same record apart. */
const recordKeyOf =
  (queue: CrateTrack[]): KeyOf =>
  (index) =>
    String(queue[index]?.discogs_release_id ?? queue[index]?.artist ?? index);

const loadYouTubeIframeApi = (): Promise<void> => {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<void>((resolve, reject) => {
    const previousReadyCallback = window.onYouTubeIframeAPIReady;
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${YOUTUBE_IFRAME_API_URL}"]`,
    );
    const script = existingScript ?? document.createElement('script');
    // Assigned after the handlers are created so both can close over it.
    // eslint-disable-next-line prefer-const
    let timeoutId: number | undefined;

    const cleanup = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      script.removeEventListener('error', handleError);
    };
    const handleError = () => {
      cleanup();
      reject(new Error('Failed to load the YouTube iframe API'));
    };

    window.onYouTubeIframeAPIReady = () => {
      try {
        previousReadyCallback?.();
      } finally {
        cleanup();
        if (window.YT?.Player) {
          resolve();
        } else {
          reject(new Error('YouTube iframe API loaded without a player'));
        }
      }
    };

    script.addEventListener('error', handleError, { once: true });
    if (!existingScript) {
      script.id = YOUTUBE_SCRIPT_ID;
      script.src = YOUTUBE_IFRAME_API_URL;
      document.head.appendChild(script);
    }

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Timed out loading the YouTube iframe API'));
    }, 15_000);
  }).catch((error) => {
    youtubeApiPromise = null;
    throw error;
  });

  return youtubeApiPromise;
};

const createPlayerContainer = () => {
  document.getElementById(YOUTUBE_PLAYER_ID)?.remove();

  const container = document.createElement('div');
  container.id = YOUTUBE_PLAYER_ID;
  if (videoHost) {
    container.style.cssText = 'position:absolute;inset:0;';
    videoHost.appendChild(container);
    return;
  }
  container.setAttribute('aria-hidden', 'true');
  container.style.cssText =
    'position:fixed;top:-10000px;left:-10000px;width:200px;height:200px;pointer-events:none;';
  document.body.appendChild(container);
};

const resolvePlayableTrack = async (
  track: CrateTrack,
): Promise<CrateTrack | null> => {
  // The server already checked this video against the track (playlistAudio).
  if (track.audio_status === 'ready' && track.youtube_video_id) return track;

  const knownVideoId =
    resolvedVideoIds.get(track.id) ?? track.youtube_video_id ?? null;
  if (knownVideoId) {
    const validationKey = `${track.id}:${knownVideoId}`;
    let isValid = validatedVideoIds.get(track.id) === knownVideoId;

    if (!isValid) {
      let validation = videoValidationPromises.get(validationKey);
      if (!validation) {
        validation = validateTrackVideo(knownVideoId, track).finally(() => {
          videoValidationPromises.delete(validationKey);
        });
        videoValidationPromises.set(validationKey, validation);
      }
      isValid = await validation;
    }

    if (isValid) {
      resolvedVideoIds.set(track.id, knownVideoId);
      validatedVideoIds.set(track.id, knownVideoId);
      return track.youtube_video_id === knownVideoId
        ? track
        : { ...track, youtube_video_id: knownVideoId };
    }

    // A stored mapping can become stale or simply be wrong. Never let it win
    // over current artist/title evidence (for example, a recipe returned for
    // Akufen's "Pickled Beets").
    resolvedVideoIds.delete(track.id);
    validatedVideoIds.delete(track.id);
  }

  let resolution = videoResolutionPromises.get(track.id);
  if (!resolution) {
    resolution = searchTrackVideo(track).finally(() => {
      videoResolutionPromises.delete(track.id);
    });
    videoResolutionPromises.set(track.id, resolution);
  }

  const videoId = await resolution;
  if (!videoId) return null;

  resolvedVideoIds.set(track.id, videoId);
  validatedVideoIds.set(track.id, videoId);
  return { ...track, youtube_video_id: videoId };
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  player: null,
  isReady: false,
  isPlaying: false,
  playingTrackId: null,
  currentTrack: null,
  queue: [],
  currentIndex: 0,
  upNext: [],
  isPlayingUpNext: false,
  playbackIssue: null,
  isShuffleEnabled: false,
  isRepeatEnabled: false,
  playOrder: [],
  orderPosition: 0,
  volume: 80,
  currentTime: 0,
  duration: 0,
  timeUpdateInterval: null,

  initializePlayer: async () => {
    if (typeof window === 'undefined') return;
    if (get().player && get().isReady) return;
    if (playerInitializationPromise) return playerInitializationPromise;

    playerInitializationPromise = (async () => {
      await loadYouTubeIframeApi();
      if (get().player && get().isReady) return;

      createPlayerContainer();

      await new Promise<void>((resolve, reject) => {
        let readyTimeoutId: number | undefined;
        let didBecomeReady = false;

        const ytPlayer = new window.YT.Player(YOUTUBE_PLAYER_ID, {
          width: videoHost ? '100%' : '200',
          height: videoHost ? '100%' : '200',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            origin: window.location.origin,
            enablejsapi: 1,
            playsinline: 1,
            rel: 0,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event) => {
              didBecomeReady = true;
              if (readyTimeoutId !== undefined) {
                window.clearTimeout(readyTimeoutId);
              }
              event.target.setVolume(get().volume);
              set({ player: event.target, isReady: true });
              resolve();
            },
            onStateChange: (event: YouTubeEvent) => {
              if (event.data !== -1) {
                set({ isReady: true });
              }
              const isPlaying = event.data === 1;
              set({ isPlaying });

              const { startTimeTracking, stopTimeTracking } = get();
              if (isPlaying) {
                startTimeTracking();
              } else {
                stopTimeTracking();
              }

              if (event.data === 0) {
                const endedTrackId = get().playingTrackId;
                window.setTimeout(() => {
                  if (get().playingTrackId === endedTrackId) {
                    void get().playNext();
                  }
                }, 1000);
              }
            },
            onError: (event: YouTubeEvent) => {
              if (![2, 5, 100, 101, 150, 153].includes(event.data)) return;

              const failedTrackId = get().playingTrackId;
              get().stopTimeTracking();
              set((state) => ({
                isPlaying: false,
                currentTrack:
                  state.currentTrack?.id === failedTrackId
                    ? { ...state.currentTrack, youtube_video_id: null }
                    : state.currentTrack,
                queue: state.queue.map((track) =>
                  track.id === failedTrackId
                    ? { ...track, youtube_video_id: null }
                    : track,
                ),
              }));

              // These errors belong to the selected video, not the player.
              // Keep the iframe alive so the next queue item can reuse it.
              if (failedTrackId) {
                resolvedVideoIds.delete(failedTrackId);
                validatedVideoIds.delete(failedTrackId);
                window.setTimeout(() => {
                  if (get().playingTrackId === failedTrackId) {
                    void get().playNext();
                  }
                }, 1000);
              }
            },
            onAutoplayBlocked: () => {
              get().stopTimeTracking();
              set({ isPlaying: false });
            },
          },
        });

        if (!didBecomeReady) {
          readyTimeoutId = window.setTimeout(() => {
            ytPlayer.destroy();
            reject(new Error('Timed out waiting for the YouTube player'));
          }, 15_000);
        }
      });
    })().catch((error) => {
      console.error('Failed to initialize YouTube player:', error);
      playerInitializationPromise = null;
      document.getElementById(YOUTUBE_PLAYER_ID)?.remove();
      set({ isReady: false, player: null, isPlaying: false });
    });

    return playerInitializationPromise;
  },

  setPlayer: (player) => set({ player }),
  setIsReady: (ready) => set({ isReady: ready }),
  setPlayingTrackId: (trackId) => set({ playingTrackId: trackId }),

  playTrack: async (track) => (await startTrack(track)) === 'playing',

  pauseTrack: () => {
    const { player, stopTimeTracking } = get();
    if (!player) return;

    playbackRequestId += 1;
    player.pauseVideo();
    set({ isPlaying: false });
    stopTimeTracking();
  },

  togglePlayPause: async (track) => {
    const { currentTrack, playingTrackId, isPlaying } = get();
    if (playingTrackId !== track.id) return get().playTrack(track);

    if (isPlaying) {
      get().pauseTrack();
      return true;
    }

    const activeTrack = currentTrack?.id === track.id ? currentTrack : track;
    if (!activeTrack.youtube_video_id) return get().playTrack(activeTrack);

    try {
      await get().initializePlayer();
      const { player, isReady, startTimeTracking } = get();
      if (!player || !isReady) return false;

      playbackRequestId += 1;
      player.playVideo();
      set({ isPlaying: true });
      startTimeTracking();
      return true;
    } catch (error) {
      console.error('Failed to resume track:', error);
      return false;
    }
  },

  setQueue: (tracks, startIndex = 0) => {
    const queue = tracks.map((track) => {
      const videoId =
        resolvedVideoIds.get(track.id) ?? track.youtube_video_id ?? null;
      return videoId === track.youtube_video_id
        ? track
        : { ...track, youtube_video_id: videoId };
    });
    const { order, position } = createPlayOrder({
      length: queue.length,
      startIndex,
      shuffle: get().isShuffleEnabled,
      keyOf: recordKeyOf(queue),
    });
    set({
      queue,
      currentIndex: order[position] ?? 0,
      playOrder: order,
      orderPosition: position,
    });
  },

  addToQueue: (track) => {
    if (get().upNext.some((queued) => queued.id === track.id)) return;
    const videoId =
      resolvedVideoIds.get(track.id) ?? track.youtube_video_id ?? null;
    const queuedTrack =
      videoId === track.youtube_video_id
        ? track
        : { ...track, youtube_video_id: videoId };
    set((state) => ({ upNext: [...state.upNext, queuedTrack] }));
  },

  playUpNext: async (trackId) => {
    const track = get().upNext.find((queued) => queued.id === trackId);
    if (!track) return false;
    get().removeFromUpNext(trackId);
    return (await startTrack(track, { fromUpNext: true })) === 'playing';
  },

  removeFromUpNext: (trackId) =>
    set((state) => ({
      upNext: state.upNext.filter((queued) => queued.id !== trackId),
    })),

  clearUpNext: () => set({ upNext: [] }),

  removeFromQueue: (trackId) => {
    const { queue, currentIndex, playingTrackId, isPlayingUpNext } = get();
    if (trackId === playingTrackId && !isPlayingUpNext) return;

    const removedIndex = queue.findIndex((track) => track.id === trackId);
    if (removedIndex === -1) return;
    const newIndex =
      removedIndex < currentIndex ? currentIndex - 1 : currentIndex;
    const { order, position } = removeFromOrder(
      { order: get().playOrder, position: get().orderPosition },
      removedIndex,
    );

    set({
      queue: queue.filter((track) => track.id !== trackId),
      currentIndex: Math.max(0, newIndex),
      playOrder: order,
      orderPosition: position,
    });
  },

  clearQueue: () => {
    const { player, stopTimeTracking } = get();
    playbackRequestId += 1;
    player?.stopVideo();
    stopTimeTracking();
    set({
      queue: [],
      currentIndex: 0,
      upNext: [],
      isPlayingUpNext: false,
      playbackIssue: null,
      playOrder: [],
      orderPosition: 0,
      currentTrack: null,
      playingTrackId: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });
  },

  playNext: () => advance(1),

  playPrevious: async () => {
    if (get().currentTrack && get().currentTime > RESTART_AFTER_SECONDS) {
      get().seekTo(0);
      return true;
    }
    const played = await advance(-1);
    // At the start of a non-repeating queue, go back to the top of the track.
    if (!played && get().currentTrack) get().seekTo(0);
    return played;
  },

  toggleShuffle: () => get().setShuffle(!get().isShuffleEnabled),

  toggleRepeat: () => get().setRepeat(!get().isRepeatEnabled),

  setShuffle: (enabled) => {
    const { queue, currentIndex } = get();
    // Re-anchor on the current track: shuffling keeps it playing and puts the
    // rest after it; turning shuffle off continues in queue order from here.
    const { order, position } = createPlayOrder({
      length: queue.length,
      startIndex: currentIndex,
      shuffle: enabled,
      keyOf: recordKeyOf(queue),
    });
    set({
      isShuffleEnabled: enabled,
      playOrder: order,
      orderPosition: position,
    });
  },

  setRepeat: (enabled) => set({ isRepeatEnabled: enabled }),

  setVolume: (volume) => {
    const { player } = get();
    if (player) {
      player.setVolume(volume);
    }
    set({ volume });
  },

  setCurrentTime: (time) => {
    set({ currentTime: time });
  },

  setDuration: (duration) => {
    set({ duration });
  },

  seekTo: (time) => {
    const { player } = get();
    if (player) {
      player.seekTo(time);
      set({ currentTime: time });
    }
  },

  startTimeTracking: () => {
    const { timeUpdateInterval } = get();
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
    }

    const interval = setInterval(() => {
      const { player, isPlaying } = get();
      if (player && isPlaying) {
        try {
          const currentTime = player.getCurrentTime();
          const duration = player.getDuration();
          set({ currentTime, duration });
        } catch (error) {
          console.error('Error updating time:', error);
        }
      }
    }, 1000);

    set({ timeUpdateInterval: interval });
  },

  stopTimeTracking: () => {
    const { timeUpdateInterval } = get();
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
      set({ timeUpdateInterval: null });
    }
  },

  reset: () => {
    const { player, timeUpdateInterval } = get();
    playbackRequestId += 1;
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
    }
    player?.destroy();
    if (typeof document !== 'undefined') {
      document.getElementById(YOUTUBE_PLAYER_ID)?.remove();
    }
    playerInitializationPromise = null;
    resolvedVideoIds.clear();
    videoResolutionPromises.clear();
    validatedVideoIds.clear();
    videoValidationPromises.clear();

    set({
      player: null,
      isReady: false,
      playingTrackId: null,
      currentTrack: null,
      isPlaying: false,
      queue: [],
      currentIndex: 0,
      upNext: [],
      isPlayingUpNext: false,
      playbackIssue: null,
      isShuffleEnabled: false,
      isRepeatEnabled: false,
      playOrder: [],
      orderPosition: 0,
      volume: 80,
      currentTime: 0,
      duration: 0,
      timeUpdateInterval: null,
    });
  },
}));

/**
 * How an attempt to play a track ended. `no-audio` is about the track (move
 * on to the next); `unavailable` is about the search or the player (the next
 * track would fail the same way); `superseded` means the listener started
 * something else meanwhile.
 */
type PlayOutcome = 'playing' | 'no-audio' | 'unavailable' | 'superseded';

async function startTrack(
  track: CrateTrack,
  { fromUpNext = false }: { fromUpNext?: boolean } = {},
): Promise<PlayOutcome> {
  const { getState: get, setState: set } = usePlayerStore;
  const requestId = ++playbackRequestId;

  try {
    const queuedTrack = get().queue.find((item) => item.id === track.id);
    const resolvedTrack = await resolvePlayableTrack({
      ...track,
      youtube_video_id:
        track.youtube_video_id ?? queuedTrack?.youtube_video_id ?? null,
    });
    if (requestId !== playbackRequestId) return 'superseded';
    if (!resolvedTrack) return 'no-audio';

    await get().initializePlayer();
    if (requestId !== playbackRequestId) return 'superseded';

    const { player, isReady, startTimeTracking } = get();
    if (!player || !isReady || !resolvedTrack.youtube_video_id) {
      return 'unavailable';
    }

    player.loadVideoById({
      videoId: resolvedTrack.youtube_video_id,
      suggestedQuality: 'highres',
    });

    set((state) => {
      // A track from `upNext` plays between two tracks of the queue, so the
      // queue keeps its place even when it holds the same track.
      const queueIndex = fromUpNext
        ? -1
        : state.queue.findIndex((item) => item.id === resolvedTrack.id);
      const queue = state.queue.map((item) =>
        item.id === resolvedTrack.id ? { ...item, ...resolvedTrack } : item,
      );

      const orderPosition = state.playOrder.indexOf(queueIndex);
      return {
        queue,
        currentIndex: queueIndex === -1 ? state.currentIndex : queueIndex,
        orderPosition:
          orderPosition === -1 ? state.orderPosition : orderPosition,
        isPlayingUpNext: fromUpNext,
        playbackIssue: null,
        playingTrackId: resolvedTrack.id,
        currentTrack: resolvedTrack,
        isPlaying: true,
        currentTime: 0,
        duration: 0,
      };
    });

    player.playVideo();
    startTimeTracking();
    return 'playing';
  } catch (error) {
    // Whatever was playing before carries on, so `isPlaying` stands.
    console.error('Failed to play track:', error);
    return requestId === playbackRequestId ? 'unavailable' : 'superseded';
  }
}

/**
 * Move to the next or previous track. Queued tracks (`upNext`) come first,
 * then the play order. Tracks that turn out to have no audio are passed
 * over, a limited number per call; it stops when the audio search itself is
 * failing, or when the listener starts something else meanwhile.
 */
async function advance(direction: 1 | -1): Promise<boolean> {
  const store = usePlayerStore;
  const tries = Math.min(
    store.getState().queue.length + store.getState().upNext.length,
    MAX_TRACKS_TRIED,
  );
  let passedOver = 0;
  // Nothing played: say why, unless the order simply ran out.
  const stop = (reason?: 'no-audio' | 'unavailable') => {
    const issue = reason ?? (passedOver > 0 ? 'no-audio' : null);
    if (issue) store.setState({ playbackIssue: { reason: issue } });
    return false;
  };

  for (let attempt = 0; attempt < tries; attempt++) {
    const state = store.getState();
    const { upNext, isPlayingUpNext, playOrder, orderPosition } = state;
    let track: CrateTrack | undefined;
    let fromUpNext = false;

    if (direction === 1 && state.upNext.length > 0) {
      track = state.upNext[0];
      fromUpNext = true;
      store.setState({ upNext: state.upNext.slice(1) });
    } else if (direction === -1 && state.isPlayingUpNext) {
      // Back to the track of the queue that the queued one followed.
      track = state.queue[state.playOrder[state.orderPosition]];
      store.setState({ isPlayingUpNext: false });
      if (!track) return stop();
    } else {
      const current = { order: state.playOrder, position: state.orderPosition };
      const position =
        direction === 1
          ? nextPosition(current, state.isRepeatEnabled)
          : previousPosition(current, state.isRepeatEnabled);
      if (position === null) return stop();

      // Each loop of a repeating shuffle gets a fresh order.
      const order =
        direction === 1 &&
        position === 0 &&
        state.isShuffleEnabled &&
        state.queue.length > 1
          ? nextShuffleCycle({
              length: state.queue.length,
              lastIndex: state.currentIndex,
              keyOf: recordKeyOf(state.queue),
            })
          : state.playOrder;
      store.setState({ playOrder: order, orderPosition: position });
      track = state.queue[order[position]];
    }

    const outcome = track
      ? await startTrack(track, { fromUpNext })
      : 'no-audio';
    if (outcome === 'playing') return true;
    if (outcome === 'superseded') return false;
    if (outcome === 'unavailable') {
      // Keep the place, so trying again later tries this track again.
      store.setState({ upNext, isPlayingUpNext, playOrder, orderPosition });
      return stop('unavailable');
    }
    passedOver += 1;
  }
  return stop();
}

/**
 * Render the YouTube player inside `host` instead of offscreen. Public pages
 * and embeds must show it: YouTube's developer policies don't allow playing
 * from a player that isn't displayed. Pass null when the host unmounts.
 */
export function setPlayerVideoHost(host: HTMLElement | null) {
  if (host === videoHost) return;
  videoHost = host;

  // The existing player lives in the old place; build a new one on next play.
  const { player, stopTimeTracking } = usePlayerStore.getState();
  if (!player && !playerInitializationPromise) return;
  playbackRequestId += 1;
  stopTimeTracking();
  player?.destroy();
  document.getElementById(YOUTUBE_PLAYER_ID)?.remove();
  playerInitializationPromise = null;
  usePlayerStore.setState({ player: null, isReady: false, isPlaying: false });
}
