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

const YOUTUBE_IFRAME_API_URL = 'https://www.youtube.com/iframe_api';
const YOUTUBE_PLAYER_ID = 'youtube-player';
const YOUTUBE_SCRIPT_ID = 'youtube-iframe-api';

let youtubeApiPromise: Promise<void> | null = null;
let playerInitializationPromise: Promise<void> | null = null;
let playbackRequestId = 0;

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
  queue: CrateTrack[];
  currentIndex: number;
  isShuffleEnabled: boolean;
  isRepeatEnabled: boolean;
  shuffledIndices: number[];
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
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;

  // Playback controls
  playNext: () => Promise<boolean>;
  playPrevious: () => Promise<boolean>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
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

// Helper function to shuffle array indices
const shuffleArray = (array: number[]): number[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

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
  container.setAttribute('aria-hidden', 'true');
  container.style.cssText =
    'position:fixed;top:-10000px;left:-10000px;width:200px;height:200px;pointer-events:none;';
  document.body.appendChild(container);
};

const resolvePlayableTrack = async (
  track: CrateTrack,
): Promise<CrateTrack | null> => {
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
  isShuffleEnabled: false,
  isRepeatEnabled: false,
  shuffledIndices: [],
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
          width: '200',
          height: '200',
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

  playTrack: async (track) => {
    const requestId = ++playbackRequestId;

    try {
      const queuedTrack = get().queue.find((item) => item.id === track.id);
      const resolvedTrack = await resolvePlayableTrack({
        ...track,
        youtube_video_id:
          track.youtube_video_id ?? queuedTrack?.youtube_video_id ?? null,
      });
      if (!resolvedTrack || requestId !== playbackRequestId) return false;

      await get().initializePlayer();
      if (requestId !== playbackRequestId) return false;

      const { player, isReady, startTimeTracking } = get();
      if (!player || !isReady || !resolvedTrack.youtube_video_id) return false;

      player.loadVideoById({
        videoId: resolvedTrack.youtube_video_id,
        suggestedQuality: 'highres',
      });

      set((state) => {
        const queueIndex = state.queue.findIndex(
          (item) => item.id === resolvedTrack.id,
        );
        const queue = state.queue.map((item) =>
          item.id === resolvedTrack.id ? { ...item, ...resolvedTrack } : item,
        );

        return {
          queue,
          currentIndex: queueIndex === -1 ? state.currentIndex : queueIndex,
          playingTrackId: resolvedTrack.id,
          currentTrack: resolvedTrack,
          isPlaying: true,
          currentTime: 0,
          duration: 0,
        };
      });

      player.playVideo();
      startTimeTracking();
      return true;
    } catch (error) {
      console.error('Failed to play track:', error);
      if (requestId === playbackRequestId) {
        get().stopTimeTracking();
        set({ isPlaying: false });
      }
      return false;
    }
  },

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
    const indices = Array.from({ length: queue.length }, (_, i) => i);
    set({
      queue,
      currentIndex:
        queue.length === 0
          ? 0
          : Math.min(Math.max(startIndex, 0), queue.length - 1),
      shuffledIndices: shuffleArray(indices),
    });
  },

  addToQueue: (track) => {
    const { queue } = get();
    if (!queue.find((t) => t.id === track.id)) {
      const videoId =
        resolvedVideoIds.get(track.id) ?? track.youtube_video_id ?? null;
      const queuedTrack =
        videoId === track.youtube_video_id
          ? track
          : { ...track, youtube_video_id: videoId };
      const newQueue = [...queue, queuedTrack];
      const indices = Array.from({ length: newQueue.length }, (_, i) => i);
      set({
        queue: newQueue,
        shuffledIndices: shuffleArray(indices),
      });
    }
  },

  removeFromQueue: (trackId) => {
    const { queue, currentIndex, playingTrackId } = get();
    if (trackId === playingTrackId) return;

    const newQueue = queue.filter((track) => track.id !== trackId);
    const indices = Array.from({ length: newQueue.length }, (_, i) => i);

    // Adjust current index if necessary
    const removedIndex = queue.findIndex((track) => track.id === trackId);
    const newIndex =
      removedIndex < currentIndex ? currentIndex - 1 : currentIndex;

    set({
      queue: newQueue,
      currentIndex: Math.max(0, newIndex),
      shuffledIndices: shuffleArray(indices),
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
      shuffledIndices: [],
      currentTrack: null,
      playingTrackId: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });
  },

  playNext: async () => {
    const {
      queue,
      currentIndex,
      isShuffleEnabled,
      isRepeatEnabled,
      shuffledIndices,
      playTrack,
    } = get();
    if (queue.length === 0) return false;

    let nextIndex: number;

    if (isShuffleEnabled) {
      const currentShuffledIndex = shuffledIndices.indexOf(currentIndex);
      const nextShuffledIndex =
        (currentShuffledIndex + 1) % shuffledIndices.length;
      nextIndex = shuffledIndices[nextShuffledIndex];
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }

    // Handle repeat mode
    if (
      !isRepeatEnabled &&
      nextIndex === 0 &&
      currentIndex === queue.length - 1
    ) {
      // End of queue and no repeat
      return false;
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      return playTrack(nextTrack);
    }

    return false;
  },

  playPrevious: async () => {
    const {
      queue,
      currentIndex,
      isShuffleEnabled,
      shuffledIndices,
      playTrack,
    } = get();
    if (queue.length === 0) return false;

    let prevIndex: number;

    if (isShuffleEnabled) {
      const currentShuffledIndex = shuffledIndices.indexOf(currentIndex);
      const prevShuffledIndex =
        currentShuffledIndex === 0
          ? shuffledIndices.length - 1
          : currentShuffledIndex - 1;
      prevIndex = shuffledIndices[prevShuffledIndex];
    } else {
      prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
    }

    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      return playTrack(prevTrack);
    }

    return false;
  },

  toggleShuffle: () => {
    const { isShuffleEnabled, queue } = get();
    const newShuffleState = !isShuffleEnabled;
    const indices = Array.from({ length: queue.length }, (_, i) => i);

    set({
      isShuffleEnabled: newShuffleState,
      shuffledIndices: newShuffleState ? shuffleArray(indices) : indices,
    });
  },

  toggleRepeat: () => {
    set((state) => ({ isRepeatEnabled: !state.isRepeatEnabled }));
  },

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
      isShuffleEnabled: false,
      isRepeatEnabled: false,
      shuffledIndices: [],
      volume: 80,
      currentTime: 0,
      duration: 0,
      timeUpdateInterval: null,
    });
  },
}));
