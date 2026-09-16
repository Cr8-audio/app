import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LoadingSpinner } from '@/lib/components/ui/loading';
import EnhancedChatInterface from '@/lib/components/ai-assistant/chat/EnhancedChatInterface';
import ErrorBoundary from '@/lib/components/Error/ErrorBoundary';
import { CrateTrack } from '@/lib/types';

export const Route = createFileRoute('/analyze/chat')({
  component: ChatPage,
});

function ChatPage() {
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);
  const convexTracks = useQuery(api.tracks.getUserTracks);

  const tracks = useMemo(() => {
    if (!convexTracks) return [];
    return convexTracks.map((track) => ({
      ...track,
      id: track.id || track._id,
    })) as CrateTrack[];
  }, [convexTracks]);

  useEffect(() => {
    if (user === null) {
      // Unauthenticated → landing / auth
      navigate({ to: '/', replace: true });
      return;
    }
    if (user && (!user.username || !user.onboardingComplete)) {
      navigate({ to: '/onboarding', replace: true });
    }
  }, [user, navigate]);

  // Loading auth or tracks
  if (user === undefined || (user && convexTracks === undefined)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Redirecting (spinner while navigate runs)
  if (user === null || !user.username || !user.onboardingComplete) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* Contained chat-home: fill content area without horizontal bleed */}
      <div className="-m-6 flex h-[calc(100vh-4rem-5rem)] max-w-full flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden border-x-2 border-black bg-bg">
          <EnhancedChatInterface
            tracks={tracks}
            onTracksFilter={() => {}}
            isOpen
            onClose={() => {}}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
