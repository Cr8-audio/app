import { useEffect } from 'react';
import { AlertCircle, Check, Disc3, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/lib/components/ui/button';
import { useDiscogsConnection } from '@/lib/hooks/useDiscogsConnection';
import { cn } from '@/lib/utils/tailwind';

interface DiscogsConnectionCardProps {
  onConnectionChange?: (connected: boolean) => void;
  variant?: 'default' | 'compact';
}

function formatSyncSummary(
  releaseCount: number | null,
  lastSyncedAt: number | null,
) {
  if (lastSyncedAt === null) return null;
  return `${releaseCount ?? 0} releases · Synced ${new Date(
    lastSyncedAt,
  ).toLocaleString()}`;
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
  const isConnected = state === 'connected';
  const needsReconnection = state === 'needs_reconnection';

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            <Disc3 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Discogs
              </h3>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                  isConnected
                    ? 'bg-primary/10 text-primary'
                    : needsReconnection
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {state === 'loading' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isConnected ? (
                  <Check className="h-3 w-3" />
                ) : needsReconnection ? (
                  <AlertCircle className="h-3 w-3" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
                {state === 'loading'
                  ? 'Checking'
                  : isConnected
                    ? 'Connected'
                    : needsReconnection
                      ? 'Reconnect needed'
                      : 'Not connected'}
              </span>
            </div>

            {variant === 'default' && (
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Sync your records and physical music collection, browse release
                details, and bring tracks into your Crate library.
              </p>
            )}

            {discogs.username && (
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  @{discogs.username}
                </p>
                {isSyncing ? (
                  <p className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Syncing your collection…
                  </p>
                ) : discogs.syncStatus === 'error' ? (
                  <p className="text-destructive">
                    Last sync failed: {discogs.syncError}
                  </p>
                ) : (
                  syncSummary && <p>{syncSummary}</p>
                )}
              </div>
            )}

            {needsReconnection && (
              <p className="mt-3 text-xs leading-5 text-destructive">
                Reconnect Discogs so Crate can keep your collection up to date.
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          {isConnected ? (
            <>
              <Button
                variant="outline"
                className="min-h-10 rounded-full"
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isSyncing ? 'Syncing…' : 'Sync now'}
              </Button>
              <Button
                variant="ghost"
                className="min-h-10 rounded-full text-muted-foreground hover:text-destructive"
                onClick={handleDisconnect}
                disabled={discogs.isDisconnecting}
              >
                {discogs.isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
              </Button>
            </>
          ) : needsReconnection ? (
            <>
              <Button
                className="min-h-10 rounded-full"
                onClick={handleConnect}
                disabled={discogs.isConnecting}
              >
                {discogs.isConnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {discogs.isConnecting ? 'Reconnecting…' : 'Reconnect'}
              </Button>
              <Button
                variant="ghost"
                className="min-h-10 rounded-full text-muted-foreground hover:text-destructive"
                onClick={handleDisconnect}
                disabled={discogs.isDisconnecting}
              >
                {discogs.isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
              </Button>
            </>
          ) : (
            <Button
              className="min-h-10 rounded-full"
              onClick={handleConnect}
              disabled={discogs.isConnecting || state === 'loading'}
            >
              {discogs.isConnecting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {discogs.isConnecting ? 'Connecting…' : 'Connect Discogs'}
            </Button>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/25 px-5 py-3 text-xs text-muted-foreground sm:px-6">
        Your Discogs access token is encrypted and stored server-side.
      </div>
    </div>
  );
}

export default DiscogsConnectionCard;
