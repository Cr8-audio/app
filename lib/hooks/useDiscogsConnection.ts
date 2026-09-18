import { useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

/** Where to land after the Discogs callback; set before leaving for discogs.com. */
export const DISCOGS_RETURN_KEY = 'crate:discogs-return-to';

export type DiscogsConnectionState =
  | 'loading'
  | 'not_connected'
  | 'needs_reconnection'
  | 'connected';

export function getDiscogsConnectionState(
  status:
    | { connected: false }
    | { connected: true; needsReconnection: boolean }
    | null
    | undefined,
): DiscogsConnectionState {
  if (status === undefined) return 'loading';
  if (!status?.connected) return 'not_connected';
  return status.needsReconnection ? 'needs_reconnection' : 'connected';
}

/**
 * Discogs connection state and actions. Tokens stay in Convex; the browser
 * only ever sees status.
 */
export function useDiscogsConnection() {
  const status = useQuery(api.discogs.getConnectionStatus);
  const startConnection = useAction(api.discogs.startConnection);
  const disconnectMutation = useMutation(api.discogs.disconnect);
  const requestSync = useMutation(api.discogs.requestSync);

  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const connect = async () => {
    setIsConnecting(true);
    try {
      const { authUrl } = await startConnection({
        origin: window.location.origin,
      });
      try {
        sessionStorage.setItem(
          DISCOGS_RETURN_KEY,
          window.location.pathname + window.location.search,
        );
      } catch {
        // Storage can be unavailable (private mode); the callback has a default.
      }
      window.location.href = authUrl;
    } catch (error) {
      setIsConnecting(false);
      throw error;
    }
  };

  const disconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectMutation();
    } finally {
      setIsDisconnecting(false);
    }
  };

  const connected = status?.connected ? status : null;

  return {
    state: getDiscogsConnectionState(status),
    username: connected?.username ?? null,
    syncStatus: connected?.syncStatus ?? null,
    syncError: connected?.syncError ?? null,
    lastSyncedAt: connected?.lastSyncedAt ?? null,
    releaseCount: connected?.releaseCount ?? null,
    isConnecting,
    isDisconnecting,
    connect,
    disconnect,
    sync: () => requestSync(),
  };
}
