import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { CollectionRelease } from '@/lib/types';
import { useDiscogsConnection } from './useDiscogsConnection';

/**
 * The user's Discogs collection as synced into Convex. Updates live while a
 * sync is running.
 */
export function useDiscogsCollection() {
  const releases = useQuery(api.discogsCollection.getCollection);
  const discogs = useDiscogsConnection();

  const collection = (releases ?? []) as unknown as CollectionRelease[];
  const isSyncing = discogs.syncStatus === 'syncing';

  return {
    collection,
    total: collection.length,
    loading: releases === undefined || (isSyncing && collection.length === 0),
    error: discogs.syncStatus === 'error' ? discogs.syncError : null,
    // Show the connect prompt only when there is nothing to show.
    needsConnection:
      collection.length === 0 &&
      (discogs.state === 'not_connected' ||
        discogs.state === 'needs_reconnection'),
    isSyncing,
  };
}
