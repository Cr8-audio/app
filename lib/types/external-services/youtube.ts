export interface PlaybackError {
  message: string;
  details?: string;
  trackPosition?: string;
}

export interface YouTubePlayer {
  destroy(): void;
  loadVideoById(params: { videoId: string; suggestedQuality: string }): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  getPlayerState(): number;
  setVolume(volume: number): void;
  getVolume(): number;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
}

export interface YouTubeConfig {
  width: string;
  height: string;
  playerVars: {
    autoplay: number;
    controls: number;
    disablekb: number;
    fs: number;
    modestbranding: number;
    origin: string;
    enablejsapi: number;
    playsinline: number;
    rel: number;
    iv_load_policy: number;
  };
  events: {
    onReady: (event: YouTubeEvent) => void;
    onStateChange: (event: YouTubeEvent) => void;
    onError: (event: YouTubeEvent) => void;
  };
}

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: YouTubeConfig) => YouTubePlayer;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface YouTubeEvent {
  data: number;
  target: YouTubePlayer;
}
