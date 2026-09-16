import { createFileRoute } from '@tanstack/react-router';
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
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/$username/settings/connections')({
  component: ConnectionsPage,
});

interface OAuthStatus {
  hasOAuthTokens: boolean;
  hasUserData: boolean;
  isFullyConnected: boolean;
  username: string | null;
}

function ConnectionsPage() {
  const user = useQuery(api.users.getCurrentUser);
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

    // Only check if user is logged in and we have the mutation ready
    if (user) {
      checkOAuthStatus();
    }
  }, [user, discogsProfile, saveDiscogsProfile]);

  const handleConnectDiscogs = async () => {
    setIsConnecting(true);

    try {
      // Make a request to get the Discogs OAuth URL
      const response = await fetch('/api/auth/discogs/request-token');

      if (!response.ok) {
        throw new Error('Failed to initiate Discogs connection');
      }

      const { authUrl } = await response.json();

      // Redirect to Discogs OAuth
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
      // Clear cookies via API
      const response = await fetch('/api/auth/discogs/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      // Remove profile from Convex
      await removeDiscogsProfile();

      // Update local state
      setOauthStatus({
        hasOAuthTokens: false,
        hasUserData: false,
        isFullyConnected: false,
        username: null,
      });

      toast.success('Discogs disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect Discogs:', error);
      toast.error('Failed to disconnect. Please try again.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Determine connection status
  const hasProfile = !!discogsProfile;
  const hasValidOAuth = oauthStatus?.isFullyConnected ?? false;
  const isFullyConnected = hasProfile && hasValidOAuth;
  const needsReconnection = hasProfile && !hasValidOAuth;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Music Service Connections</h1>
        <p className="text-gray-600">
          Connect your music services to sync your collection and enhance your
          Crate experience
        </p>
      </div>

      <div className="space-y-4">
        {/* Discogs Connection */}
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
                <p className="text-sm text-gray-600 mb-3">
                  Sync your vinyl and physical music collection from Discogs.
                  Browse releases, view details, and add tracks to your Crate
                  library.
                </p>
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
                        Refresh Connection
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
                        Reconnect Discogs
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

        {/* Spotify Connection (Coming Soon) */}
        <Card className="p-6 opacity-60">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Music className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-semibold">Spotify</h3>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Connect your Spotify account to sync your playlists and
                  listening history. Create cross-platform playlists combining
                  your digital and physical music.
                </p>
              </div>
            </div>
            <Button disabled variant="outline" className="ml-4">
              Connect Spotify
            </Button>
          </div>
        </Card>

        {/* Apple Music Connection (Coming Soon) */}
        <Card className="p-6 opacity-60">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Music className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-semibold">Apple Music</h3>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Sync your Apple Music library and playlists. Seamlessly
                  integrate your digital music collection with Crate.
                </p>
              </div>
            </div>
            <Button disabled variant="outline" className="ml-4">
              Connect Apple Music
            </Button>
          </div>
        </Card>
      </div>

      {/* Help Section */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">
          About Music Connections
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Connect multiple music services to create a unified library</li>
          <li>• Your connections are secure and encrypted</li>
          <li>• You can disconnect a service at any time</li>
          <li>• Syncing happens automatically in the background</li>
        </ul>
        <a
          href="https://docs.crate.audio/connections"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mt-2"
        >
          Learn more about connections
          <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      </div>
    </div>
  );
}
