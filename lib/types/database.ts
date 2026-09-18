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
}

export interface InsertCrateTrack {
  id?: string;
  discogs_release_id: string;
  youtube_video_id?: string | null;
  title: string;
  artist: string;
  extra_artists?: string | null;
  position: string;
  duration: string;
  genres?: string | null;
  styles?: string | null;
  artwork?: string | null;
  created_at?: string | null;
}

// Playlist types
export interface Playlist {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_public: boolean | null;
  is_favorites: boolean | null;
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string | null;
  track_id: string | null;
  position: number;
  created_at: string | null;
}

export interface InsertPlaylist {
  id?: string;
  user_id?: string | null;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_public?: boolean | null;
  is_favorites?: boolean | null;
}

export interface InsertPlaylistTrack {
  id?: string;
  playlist_id?: string | null;
  track_id?: string | null;
  position: number;
  created_at?: string | null;
}
