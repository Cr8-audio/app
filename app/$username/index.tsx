import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Suspense, useEffect, useState } from 'react';
import { usePlayerStore } from '@/lib/stores';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { Button } from '@/lib/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/lib/components/ui/card';
import {
  Music,
  Play,
  Pause,
  TrendingUp,
  Shuffle,
  Heart,
  Search,
  Plus,
  Headphones,
} from 'lucide-react';
import { cn } from '@/lib/utils/tailwind';
import { CrateTrack } from '@/lib/types';
import { Image } from '@unpic/react';
import { LoadingSpinner } from '@/lib/components/ui/loading';
import { toast } from 'sonner';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export const Route = createFileRoute('/$username/')({
  component: UserProfilePage,
});

const DashboardStats = ({ tracks }: { tracks: CrateTrack[] }) => {
  const stats = {
    totalTracks: tracks.length,
    totalGenres: new Set(tracks.flatMap((t) => t.genres || [])).size,
    avgBpm:
      tracks.filter((t) => t.bpm).length > 0
        ? Math.round(
            tracks
              .filter((t) => t.bpm)
              .reduce((acc, t) => acc + (t.bpm || 0), 0) /
              tracks.filter((t) => t.bpm).length,
          )
        : 0,
    totalArtists: new Set(tracks.map((t) => t.artist)).size,
  };

  const statItems = [
    {
      label: 'Total Tracks',
      value: stats.totalTracks,
      icon: Music,
      color: 'bg-main border-2 border-gray-800',
    },
    {
      label: 'Artists',
      value: stats.totalArtists,
      icon: Headphones,
      color: 'bg-main border-2 border-gray-800',
    },
    {
      label: 'Genres',
      value: stats.totalGenres,
      icon: Heart,
      color: 'bg-main border-2 border-gray-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {statItems.map((stat) => (
        <Card key={stat.label} variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div
                className={cn(
                  'p-2 rounded-base flex items-center justify-center',
                  stat.color,
                )}
              >
                <stat.icon className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-text">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const FavoritesSection = ({
  allTracks,
  username,
}: {
  allTracks: CrateTrack[];
  username: string;
}) => {
  const {
    togglePlayPause,
    playingTrackId,
    isPlaying,
    setQueue,
    isReady,
    initializePlayer,
  } = usePlayerStore();
  const {
    getFavoriteTracksFromAllTracks,
    toggleFavorite,
    isFavorite,
    isLoading,
  } = useFavorites();
  const favoriteTracks = getFavoriteTracksFromAllTracks(allTracks).slice(0, 6);

  // Initialize player when component mounts
  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  const handlePlayTrack = (track: CrateTrack) => {
    if (!track.youtube_video_id) {
      toast.error('No audio available for this track');
      return;
    }

    if (!isReady) {
      toast.error('Player is still loading...');
      return;
    }

    try {
      // Set up the queue with favorite tracks, but use all tracks for context
      const trackIndex = allTracks.findIndex((t) => t.id === track.id);
      setQueue(allTracks, trackIndex);
      togglePlayPause(track);
    } catch (error) {
      console.error('Error playing track:', error);
      toast.error('Failed to play track');
    }
  };

  const handleToggleFavorite = async (trackId: string) => {
    const wasFavorite = isFavorite(trackId);

    try {
      await toggleFavorite(trackId);

      if (wasFavorite) {
        toast.success('Removed from favorites');
      } else {
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader className="border-b-2 border-gray-800 bg-bg">
        <CardTitle className="flex items-center space-x-2">
          <Heart className="w-5 h-5" />
          <span>Favourite list</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">
              <div className="animate-spin w-8 h-8 border-2 border-mainAccent border-t-transparent rounded-full mx-auto mb-2" />
              <p>Loading favorites...</p>
            </div>
          ) : favoriteTracks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Heart className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No favorite tracks yet</p>
              <p className="text-sm">
                Use the heart icon in the player to add favorites
              </p>
            </div>
          ) : (
            favoriteTracks.map((track: CrateTrack) => (
              <div
                key={track.id}
                className="flex items-center space-x-3 p-3 rounded-base hover:bg-mainAccent/10 transition-colors group cursor-pointer active:bg-mainAccent/20 active:scale-[0.98]"
                onClick={() => handlePlayTrack(track)}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayTrack(track);
                  }}
                  disabled={!track.youtube_video_id || !isReady}
                  className={cn(
                    'h-8 w-8 p-0 border border-gray-800 rounded-base',
                    playingTrackId === track.id && isPlaying
                      ? 'bg-main/20 hover:bg-main/30'
                      : 'bg-main hover:bg-mainAccent',
                  )}
                >
                  {playingTrackId === track.id && isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 text-black" />
                      <span className="absolute inset-0 rounded-full animate-pulse-light bg-main/30" />
                    </>
                  ) : (
                    <Play className="w-4 h-4 text-black" />
                  )}
                </Button>

                {track.artwork ? (
                  <Image
                    src={track.artwork}
                    alt={track.title}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-base object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-mainAccent border-2 border-gray-800 rounded-base flex items-center justify-center">
                    <Music className="w-5 h-5 text-black" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate text-text">
                    {track.title}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {track.artist}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(track.id);
                  }}
                  className="h-8 w-8 p-0 bg-red-100 hover:bg-red-200 text-red-600 border border-gray-800 rounded-base"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t-2 border-gray-800">
          <Link
            to="/$username/tracks"
            params={{
              username: username,
            }}
          >
            <Button variant="outline" className="w-full">
              View All Tracks
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

const QuickActionsSection = ({ username }: { username: string }) => {
  const actions = [
    {
      title: 'Explore Collection',
      description: 'Browse your Discogs collection',
      icon: Search,
      href: `/${username}/collection`,
      color: 'bg-main border-2 border-gray-800',
    },
    {
      title: 'Create Playlist',
      description: 'Organize your favorite tracks',
      icon: Plus,
      href: `/${username}/playlists`,
      color: 'bg-main border-2 border-gray-800',
    },
    {
      title: 'Shuffle Play',
      description: 'Start a random mix',
      icon: Shuffle,
      href: '#',
      color: 'bg-main border-2 border-gray-800',
      action: 'shuffle',
    },
  ];

  const { toggleShuffle, setQueue } = usePlayerStore();
  const convexTracks = useQuery(api.tracks.getUserTracks);
  const allTracks = (convexTracks || []).map((track) => ({
    ...track,
    id: track.id || track._id,
  })) as CrateTrack[];

  const handleAction = (action: string) => {
    if (action === 'shuffle') {
      if (allTracks.length > 0) {
        setQueue(allTracks, 0);
        toggleShuffle();
        toast.success('Shuffle mode enabled! Playing your collection.');
      } else {
        toast.error('No tracks available to shuffle');
      }
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader className="border-b-2 border-gray-800 bg-bg">
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>Quick Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actions.map((action) => (
            <div key={action.title}>
              {action.href === '#' ? (
                <Button
                  variant="ghost"
                  onClick={() => handleAction(action.action!)}
                  className="h-auto p-4 text-left justify-start bg-white hover:bg-mainAccent/10 border-2 border-gray-800 rounded-base shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all text-text w-full active:bg-mainAccent/20 active:scale-[0.98]"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        'p-2 rounded-base text-black flex items-center justify-center',
                        action.color,
                      )}
                    >
                      <action.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{action.title}</div>
                      <div className="text-xs text-gray-600">
                        {action.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ) : (
                <Link to={action.href}>
                  <Button
                    variant="ghost"
                    className="h-auto p-4 text-left justify-start bg-white hover:bg-mainAccent/10 border-2 border-gray-800 rounded-base shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all text-text w-full active:bg-mainAccent/20 active:scale-[0.98]"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={cn(
                          'p-2 rounded-base text-black flex items-center justify-center',
                          action.color,
                        )}
                      >
                        <action.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {action.title}
                        </div>
                        <div className="text-xs text-gray-600">
                          {action.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const WelcomeSection = ({ username }: { username: string }) => {
  const currentHour = new Date().getHours();
  const getGreeting = () => {
    if (currentHour < 12) return 'Good morning';
    if (currentHour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold text-text mb-2">
        {getGreeting()}, {username}!
      </h1>
      <p className="text-gray-600">
        Ready to explore your music collection? Here&apos;s what&apos;s
        happening with your tracks.
      </p>
    </div>
  );
};

const DashboardContent = ({ username }: { username: string }) => {
  // Use Convex queries instead of fetch
  const convexTracks = useQuery(api.tracks.getUserTracks);
  const convexPlaylists = useQuery(api.playlists.getUserPlaylists);

  const loading = convexTracks === undefined || convexPlaylists === undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Map tracks for the dashboard
  const allTracks = (convexTracks || []).map((track) => ({
    ...track,
    id: track.id || track._id,
    _convexId: track._id,
  })) as CrateTrack[];

  return (
    <div className="space-y-8">
      <WelcomeSection username={username} />

      <DashboardStats tracks={allTracks} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <FavoritesSection allTracks={allTracks} username={username} />
        <QuickActionsSection username={username} />
      </div>
    </div>
  );
};

function UserProfilePage() {
  const { username } = Route.useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (!user) {
      navigate({ to: `/`, replace: true });
    }
  }, [user]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Suspense fallback={<LoadingSpinner />}>
        <DashboardContent username={username} />
      </Suspense>
    </main>
  );
}
