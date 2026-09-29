import { DiscogsSearchResult, CrateTrack } from '@/lib/types';

/**
 * Converts a Discogs search result to a CrateTrack format for playlist compatibility
 * This allows external tracks (not in user's collection) to be used in playlists and player
 */
function convertSearchResultToTrack(result: DiscogsSearchResult): CrateTrack {
  // Generate a unique ID for external tracks using the discogs ID
  const externalId = `external_${result.id}`;

  // Extract artist and title from the title field (format: "Artist - Title")
  const titleParts = result.title.split(' - ');
  const artist = titleParts.length > 1 ? titleParts[0] : 'Unknown Artist';
  const title =
    titleParts.length > 1 ? titleParts.slice(1).join(' - ') : result.title;

  return {
    id: externalId,
    title: title || 'Unknown Title',
    artist: artist,
    discogs_release_id: result.id.toString(),
    duration: '0:00', // Duration not available from search results
    position: '1', // Default position
    artwork: result.cover_image || result.thumb || null,
    youtube_video_id: null, // Will be populated when track is played
    extra_artists: null,
    genres: result.genre?.join(',') || null,
    styles: result.style?.join(',') || null,
    created_at: new Date().toISOString(),
    bpm: null, // Will be populated if analyzed
  };
}

/**
 * Creates a temporary CrateTrack for immediate playback from search results
 * This is used when user wants to play a track directly from search without adding to playlist
 */
export function createTemporaryTrackForPlayback(
  result: DiscogsSearchResult,
  youtubeVideoId?: string,
): CrateTrack {
  const track = convertSearchResultToTrack(result);

  if (youtubeVideoId) {
    track.youtube_video_id = youtubeVideoId;
  }

  return track;
}
