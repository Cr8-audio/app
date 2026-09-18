import { useEffect } from 'react';
import { Button } from '@/lib/components/ui/button';
import { Card } from '@/lib/components/ui/card';
import {
  Music,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDiscogsConnection } from '@/lib/hooks/useDiscogsConnection';

interface DiscogsConnectionCardProps {
  onConnectionChange?: (connected: boolean) => void;
  variant?: 'default' | 'compact';
}

function formatSyncSummary(
  releaseCount: number | null,
  lastSyncedAt: number | null,
): string | null {
  if (lastSyncedAt === null) return null;
  const when = new Date(lastSyncedAt).toLocaleString();
  return `${releaseCount ?? 0} releases · synced ${when}`;
}

export function DiscogsConnectionCard({
  onConnectionChange,
  variant = 'default',
}: DiscogsConnectionCardProps) {
  const discogs = useDiscogsConnection();
  const { state } = discogs;
  const isSyncing = discogs.syncStatus === 'syncing';

  useEffect(() => {
    if (state !== 'loading') {
      onConnectionChange?.(state === 'connected');
    }
  }, [state, onConnectionChange]);

  const handleConnect = async () => {
    try {
      await discogs.connect();
    } catch (error) {
      console.error('Failed to connect Discogs:', error);
      toast.error('Failed to connect to Discogs. Please try again.');
    }
  };

  const handleSync = async () => {
    try {
      await discogs.sync();
    } catch (error) {
      console.error('Failed to sync Discogs:', error);
      toast.error('Failed to start sync. Please try again.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await discogs.disconnect();
      toast.success('Discogs disconnected');
    } catch (error) {
      console.error('Failed to disconnect Discogs:', error);
      toast.error('Failed to disconnect. Please try again.');
    }
  };

  const syncSummary = formatSyncSummary(
    discogs.releaseCount,
    discogs.lastSyncedAt,
  );

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Music className="w-6 h-6 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-semibold">Discogs</h3>
              {state === 'loading' ? (
                <div className="flex items-center space-x-1 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking...</span>
                </div>
              ) : state === 'connected' ? (
                <div className="flex items-center space-x-1 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Connected</span>
                </div>
              ) : state === 'needs_reconnection' ? (
                <div className="flex items-center space-x-1 text-amber-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Needs Reconnection</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-gray-400 text-sm">
                  <XCircle className="w-4 h-4" />
                  <span>Not connected</span>
                </div>
              )}
            </div>
            {variant === 'default' && (
              <p className="text-sm text-gray-600 mb-3">
                Sync your vinyl and physical music collection from Discogs.
                Browse releases, view details, and add tracks to your Crate
                library.
              </p>
            )}
            {state === 'needs_reconnection' && (
              <p className="text-xs text-amber-600 mb-2">
                Reconnect Discogs so Crate can keep syncing your collection.
              </p>
            )}
            {discogs.username && (
              <div className="text-xs text-gray-500 space-y-0.5">
                <p>Username: @{discogs.username}</p>
                {isSyncing ? (
                  <p className="flex items-center">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Syncing your collection...
                  </p>
                ) : discogs.syncStatus === 'error' ? (
                  <p className="text-red-600">
                    Last sync failed: {discogs.syncError}
                  </p>
                ) : (
                  syncSummary && <p>{syncSummary}</p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="ml-4">
          {state === 'connected' ? (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync now
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDisconnect}
                disabled={discogs.isDisconnecting}
              >
                {discogs.isDisconnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </Button>
            </div>
          ) : state === 'needs_reconnection' ? (
            <div className="space-y-2">
              <Button
                onClick={handleConnect}
                disabled={discogs.isConnecting}
                className="bg-amber-500 hover:bg-amber-600 text-white border-2 border-gray-800 shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all"
              >
                {discogs.isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reconnecting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reconnect
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDisconnect}
                disabled={discogs.isDisconnecting}
              >
                {discogs.isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={discogs.isConnecting || state === 'loading'}
              className="bg-main hover:bg-mainAccent border-2 border-gray-800 shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all"
            >
              {discogs.isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Discogs'
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default DiscogsConnectionCard;
