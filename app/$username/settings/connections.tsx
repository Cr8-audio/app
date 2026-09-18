import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/lib/components/ui/button';
import { Card } from '@/lib/components/ui/card';
import { Music } from 'lucide-react';
import { DiscogsConnectionCard } from '@/lib/components/onboarding/DiscogsConnectionCard';

export const Route = createFileRoute('/$username/settings/connections')({
  component: ConnectionsPage,
});

function ConnectionsPage() {
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
        <DiscogsConnectionCard />

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
          <li>
            • Access tokens stay on the server and never reach your browser
          </li>
          <li>• You can disconnect a service at any time</li>
          <li>• Syncing happens automatically in the background</li>
        </ul>
      </div>
    </div>
  );
}
