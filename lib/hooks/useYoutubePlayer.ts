import { useEffect, useRef, useState } from 'react';
import type { YouTubePlayer, YouTubeConfig, CrateTrack } from '@/lib/types';
export function useYouTubePlayer() {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const playerRef = useRef<YouTubePlayer>();
  useEffect(() => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    const playerContainer = document.createElement('div');
    playerContainer.id = 'youtube-player';
    playerContainer.style.display = 'none';
    document.body.appendChild(playerContainer);
    window.onYouTubeIframeAPIReady = () => {
      const config: YouTubeConfig = {
        width: '1',
        height: '1',
        playerVars: {
          autoplay: 1,
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
          onReady: () => setIsPlayerReady(true),
          onStateChange: () => {},
          onError: (e) => console.error('YouTube player error:', e),
        },
      };
      playerRef.current = new window.YT.Player('youtube-player', config);
    };
    return () => {
      playerRef.current?.destroy();
      document.getElementById('youtube-player')?.remove();
    };
  }, []);
  const handlePlayToggle = async (track: CrateTrack) => {
    if (!track.youtube_video_id || !playerRef.current) return;
    try {
      if (playingTrackId === track.id) {
        playerRef.current.pauseVideo();
        setPlayingTrackId(null);
      } else {
        playerRef.current.loadVideoById({
          videoId: track.youtube_video_id,
          suggestedQuality: 'small',
        });
        playerRef.current.playVideo();
        setPlayingTrackId(track.id);
      }
    } catch (error) {
      console.error('Error toggling track:', error);
    }
  };
  return {
    playingTrackId,
    isPlayerReady,
    handlePlayToggle,
  };
}
