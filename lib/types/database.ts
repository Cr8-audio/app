/**
 * Core domain types for Crate
 * These types are database-agnostic and used throughout the application.
 */

// Track types
export interface CrateTrack {
  id: string;
  discogs_release_id: string;
  youtube_video_id: string | null;
  title: string;
  artist: string;
  extra_artists: string | null;
  position: string;
  duration: string;
  genres: string | null;
  styles: string | null;
  artwork: string | null;
  created_at: string | null;
  bpm?: number | null; // not stored on Convex tracks yet
  // Set on playlist tracks; 'ready' means the server verified the video.
  audio_status?: 'ready' | 'unverified' | 'pending' | 'unavailable';
}
