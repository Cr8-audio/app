import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
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

interface OAuthStatus {
  hasOAuthTokens: boolean;
  hasUserData: boolean;
  isFullyConnected: boolean;
  username: string | null;
}

interface DiscogsConnectionCardProps {
  onConnectionChange?: (connected: boolean) => void;
  variant?: 'default' | 'compact';
}

export function DiscogsConnectionCard({
  onConnectionChange,
  variant = 'default',
}: DiscogsConnectionCardProps) {
  const discogsProfile = useQuery(api.users.getDiscogsProfile);
  const removeDiscogsProfile = useMutation(api.users.removeDiscogsProfile);
  const saveDiscogsProfile = useMutation(api.users.saveDiscogsProfile);

  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Check OAuth status on mount and auto-save profile if needed
  useEffect(() => {
    const checkOAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/discogs/status');
        if (response.ok) {
          const status = await response.json();
          setOauthStatus(status);

          // If we have valid OAuth but no Convex profile, save it
          if (status.isFullyConnected && status.username && !discogsProfile) {
            try {
              await saveDiscogsProfile({ username: status.username });
              toast.success('Discogs connected successfully!');
              onConnectionChange?.(true);
            } catch (error) {
              console.error('Failed to save Discogs profile:', error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check OAuth status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkOAuthStatus();
  }, [discogsProfile, saveDiscogsProfile, onConnectionChange]);

  // Notify parent of connection changes
  useEffect(() => {
    const hasProfile = !!discogsProfile;
    const hasValidOAuth = oauthStatus?.isFullyConnected ?? false;
    const isFullyConnected = hasProfile && hasValidOAuth;
    onConnectionChange?.(isFullyConnected);
  }, [discogsProfile, oauthStatus, onConnectionChange]);

  const handleConnectDiscogs = async () => {
    setIsConnecting(true);

    try {
      const response = await fetch('/api/auth/discogs/request-token');

      if (!response.ok) {
        throw new Error('Failed to initiate Discogs connection');
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to connect Discogs:', error);
      toast.error('Failed to connect to Discogs. Please try again.');
      setIsConnecting(false);
    }
  };

  const handleDisconnectDiscogs = async () => {
    setIsDisconnecting(true);

    try {
      const response = await fetch('/api/auth/discogs/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      await removeDiscogsProfile();

      setOauthStatus({
        hasOAuthTokens: false,
        hasUserData: false,
        isFullyConnected: false,
        username: null,
      });

      toast.success('Discogs disconnected successfully');
      onConnectionChange?.(false);
    } catch (error) {
      console.error('Failed to disconnect Discogs:', error);
      toast.error('Failed to disconnect. Please try again.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const hasProfile = !!discogsProfile;
  const hasValidOAuth = oauthStatus?.isFullyConnected ?? false;
  const isFullyConnected = hasProfile && hasValidOAuth;
  const needsReconnection = hasProfile && !hasValidOAuth;

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
              {isCheckingStatus ? (
                <div className="flex items-center space-x-1 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking...</span>
                </div>
              ) : isFullyConnected ? (
                <div className="flex items-center space-x-1 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Connected</span>
                </div>
              ) : needsReconnection ? (
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
            {needsReconnection && (
              <p className="text-xs text-amber-600 mb-2">
                Your session has expired. Please reconnect to continue using
                Discogs features.
              </p>
            )}
            {discogsProfile && (
              <div className="text-xs text-gray-500">
                <p>Username: @{discogsProfile.username}</p>
              </div>
            )}
          </div>
        </div>
        <div className="ml-4">
          {isFullyConnected ? (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleConnectDiscogs}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDisconnectDiscogs}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </Button>
            </div>
          ) : needsReconnection ? (
            <div className="space-y-2">
              <Button
                onClick={handleConnectDiscogs}
                disabled={isConnecting}
                className="bg-amber-500 hover:bg-amber-600 text-white border-2 border-gray-800 shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all"
              >
                {isConnecting ? (
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
                onClick={handleDisconnectDiscogs}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConnectDiscogs}
              disabled={isConnecting}
              className="bg-main hover:bg-mainAccent border-2 border-gray-800 shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all"
            >
              {isConnecting ? (
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
