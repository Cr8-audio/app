import { create } from 'zustand';
import type {
  YouTubePlayer as YTPlayer,
  YouTubeEvent,
  CrateTrack,
} from '@/lib/types';

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
  playTrack: (track: CrateTrack) => void;
  pauseTrack: () => void;
  togglePlayPause: (track: CrateTrack) => void;

  // Queue management
  setQueue: (tracks: CrateTrack[], startIndex?: number) => void;
  addToQueue: (track: CrateTrack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;

  // Playback controls
  playNext: () => void;
  playPrevious: () => void;
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
    try {
      await new Promise<void>((resolve) => {
        if (window.YT?.Player) {
          resolve();
          return;
        }

        window.onYouTubeIframeAPIReady = resolve;
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      });

      const container = document.createElement('div');
      container.id = 'youtube-player';
      container.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
      document.body.appendChild(container);

      const ytPlayer = new window.YT.Player('youtube-player', {
        width: '1',
        height: '1',
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
          onReady: () => {
            set({ player: ytPlayer, isReady: true });
            ytPlayer.setVolume(get().volume);
          },
          onStateChange: (event: YouTubeEvent) => {
            if (event.data !== -1) {
              set({ isReady: true });
            }
            const isPlaying = event.data === 1;
            set({ isPlaying });

            // Handle time tracking based on playback state
            const { startTimeTracking, stopTimeTracking } = get();
            if (isPlaying) {
              startTimeTracking();
            } else {
              stopTimeTracking();
            }

            // Auto-play next track when current track ends
            if (event.data === 0) {
              // YT.PlayerState.ENDED
              setTimeout(() => {
                const { playNext } = get();
                playNext();
              }, 1000);
            }
          },
          onError: (event: YouTubeEvent) => {
            if ([2, 5, 100, 101, 150].includes(event.data)) {
              set({ isReady: false, player: null, isPlaying: false });
              // Try to play next track on error
              setTimeout(() => {
                const { playNext } = get();
                playNext();
              }, 1000);
            }
          },
        },
      });
    } catch (error) {
      set({ isReady: false, player: null, isPlaying: false });
    }
  },

  setPlayer: (player) => set({ player }),
  setIsReady: (ready) => set({ isReady: ready }),
  setPlayingTrackId: (trackId) => set({ playingTrackId: trackId }),

  playTrack: (track) => {
    const { player, isReady, startTimeTracking } = get();
    if (!player || !isReady || !track.youtube_video_id) return;

    player.loadVideoById({
      videoId: track.youtube_video_id,
      suggestedQuality: 'highres',
    });
    player.playVideo();
    set({
      playingTrackId: track.id,
      currentTrack: track,
      isPlaying: true,
    });
    startTimeTracking();
  },

  pauseTrack: () => {
    const { player, stopTimeTracking } = get();
    if (!player) return;

    player.pauseVideo();
    set({ isPlaying: false });
    stopTimeTracking();
  },

  togglePlayPause: (track) => {
    const {
      player,
      playingTrackId,
      isPlaying,
      queue,
      currentIndex,
      startTimeTracking,
      stopTimeTracking,
    } = get();
    if (!player || !track.youtube_video_id) return;

    if (playingTrackId === track.id) {
      if (isPlaying) {
        player.pauseVideo();
        set({ isPlaying: false });
        stopTimeTracking();
      } else {
        player.playVideo();
        set({ isPlaying: true });
        startTimeTracking();
      }
    } else {
      // If playing a different track, update the queue and index
      const trackIndex = queue.findIndex((t) => t.id === track.id);
      if (trackIndex !== -1) {
        set({ currentIndex: trackIndex });
      }

      player.loadVideoById({
        videoId: track.youtube_video_id,
        suggestedQuality: 'highres',
      });
      player.playVideo();
      set({
        playingTrackId: track.id,
        currentTrack: track,
        isPlaying: true,
      });
      startTimeTracking();
    }
  },

  setQueue: (tracks, startIndex = 0) => {
    const indices = Array.from({ length: tracks.length }, (_, i) => i);
    set({
      queue: tracks,
      currentIndex: startIndex,
      shuffledIndices: shuffleArray(indices),
    });
  },

  addToQueue: (track) => {
    const { queue } = get();
    if (!queue.find((t) => t.id === track.id)) {
      const newQueue = [...queue, track];
      const indices = Array.from({ length: newQueue.length }, (_, i) => i);
      set({
        queue: newQueue,
        shuffledIndices: shuffleArray(indices),
      });
    }
  },

  removeFromQueue: (trackId) => {
    const { queue, currentIndex } = get();
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
    set({
      queue: [],
      currentIndex: 0,
      shuffledIndices: [],
      currentTrack: null,
      playingTrackId: null,
    });
  },

  playNext: () => {
    const {
      queue,
      currentIndex,
      isShuffleEnabled,
      isRepeatEnabled,
      shuffledIndices,
      playTrack,
    } = get();
    if (queue.length === 0) return;

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
      return;
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      set({ currentIndex: nextIndex });
      playTrack(nextTrack);
    }
  },

  playPrevious: () => {
    const {
      queue,
      currentIndex,
      isShuffleEnabled,
      shuffledIndices,
      playTrack,
    } = get();
    if (queue.length === 0) return;

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
      set({ currentIndex: prevIndex });
      playTrack(prevTrack);
    }
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
    const { timeUpdateInterval } = get();
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
    }

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
