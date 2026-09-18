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
    if (user && !user.username) {
      navigate({ to: '/onboarding', replace: true });
    }
  }, [user, navigate]);

  // Loading auth or tracks
  if (user === undefined || (user && convexTracks === undefined)) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-[var(--crate-void)]">
        <LoadingSpinner />
      </div>
    );
  }

  // Redirecting (spinner while navigate runs)
  if (user === null || !user.username) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-[var(--crate-void)]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* Nocturnal void shell — no cream column, no 2px black rails */}
      <div className="crate-chat-home flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[var(--crate-void)]">
        <EnhancedChatInterface
          tracks={tracks}
          onTracksFilter={() => {}}
          isOpen
          onClose={() => {}}
          variant="nocturnal"
        />
      </div>
    </ErrorBoundary>
  );
}
