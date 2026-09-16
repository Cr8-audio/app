import type { ReleaseDetails, ReleaseTrack } from '@/lib/types';

export const isReleaseTrack = (track: any): track is ReleaseTrack => {
  return (
    typeof track === 'object' &&
    track !== null &&
    typeof track.position === 'string' &&
    typeof track.title === 'string' &&
    typeof track.type_ === 'string' &&
    (track.duration === undefined || typeof track.duration === 'string')
  );
};

export const isReleaseDetails = (data: any): data is ReleaseDetails => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'number' &&
    typeof data.title === 'string' &&
    Array.isArray(data.tracklist) &&
    data.tracklist.every(isReleaseTrack)
  );
};
