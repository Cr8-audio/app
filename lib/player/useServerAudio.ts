import { useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { setServerAudio } from '@/lib/stores/musicPlayerStore';

/**
 * While someone is signed in, the player finds audio through the server,
 * which saves it on the track (see convex/trackAudio).
 */
export function useServerAudio(isSignedIn: boolean) {
  const resolve = useAction(api.trackAudio.resolve);

  useEffect(() => {
    if (!isSignedIn) return;
    setServerAudio((trackId) => resolve({ trackId }));
    return () => setServerAudio(null);
  }, [isSignedIn, resolve]);
}
