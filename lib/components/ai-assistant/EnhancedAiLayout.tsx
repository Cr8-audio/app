'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Bot, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/lib/components/ui/button';
import { Card } from '@/lib/components/ui/card';
import { cn } from '@/lib/utils/tailwind';
import EnhancedChatInterface from '@/lib/components/ai-assistant/chat/EnhancedChatInterface';
import { CrateTrack } from '@/lib/types';
import { usePlayerStore } from '@/lib/stores';
import ErrorBoundary from '@/lib/components/Error/ErrorBoundary';
import { toast } from 'sonner';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface EnhancedAiLayoutProps {
  children: React.ReactNode;
}

export default function EnhancedAiLayout({ children }: EnhancedAiLayoutProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [chatPosition, setChatPosition] = useState<
    'sidebar' | 'overlay' | 'bottom'
  >('sidebar');
  const { initializePlayer } = usePlayerStore();

  // Use Convex query instead of fetch
  const convexTracks = useQuery(api.tracks.getUserTracks);
  const isLoading = convexTracks === undefined;

  // Map tracks to the expected format - MEMOIZED to prevent infinite re-renders
  const tracks = useMemo(() => {
    if (!convexTracks) return [];
    return convexTracks.map((track) => ({
      ...track,
      id: track.id || track._id,
    })) as CrateTrack[];
  }, [convexTracks]);

  // Initialize player when layout mounts
  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  // Detect mobile and set appropriate chat position
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      const tablet = window.innerWidth < 1024;
      setIsMobile(mobile);

      // More sophisticated positioning logic
      if (mobile) {
        setChatPosition('overlay');
      } else if (tablet) {
        setChatPosition('bottom');
      } else {
        setChatPosition('sidebar');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTracksFilter = (filteredTracks: CrateTrack[]) => {
    if (filteredTracks.length > 0) {
      toast.success(`AI found ${filteredTracks.length} matching tracks`);
    }
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        toggleChat();
      }
      if (e.key === 'Escape' && isChatOpen) {
        closeChat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatOpen]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading AI assistant...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen">
        {/* Main Content */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out pb-20 min-h-screen',
            chatPosition === 'sidebar' &&
              isChatOpen &&
              'lg:mr-[450px] xl:mr-[500px]',
            chatPosition === 'bottom' && isChatOpen && 'pb-[420px]',
          )}
        >
          {children}
        </div>

        {/* Mobile Overlay */}
        {isMobile && isChatOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeChat}
          />
        )}

        {/* Chat Interface - Sidebar/Overlay */}
        {chatPosition !== 'bottom' && (
          <Card
            className={cn(
              'fixed right-0 transition-all duration-300 ease-in-out z-50',
              'border-l-2 border-black shadow-light bg-bg',
              {
                // Sidebar positioning - account for persistent player
                'top-16 bottom-20 w-full sm:w-[450px] xl:w-[500px]':
                  isChatOpen && chatPosition === 'sidebar',
                // Overlay positioning - full screen on mobile
                'top-16 bottom-20 w-full':
                  isChatOpen && chatPosition === 'overlay',
                'translate-x-0': isChatOpen,
                'translate-x-full': !isChatOpen,
              },
            )}
          >
            {isChatOpen && (
              <EnhancedChatInterface
                tracks={tracks}
                onTracksFilter={handleTracksFilter}
                isOpen={isChatOpen}
                onClose={closeChat}
              />
            )}
          </Card>
        )}

        {/* Chat Interface - Bottom (Tablet/Small Desktop) */}
        {chatPosition === 'bottom' && (
          <Card
            className={cn(
              'fixed bottom-20 left-0 right-0 transition-all duration-300 ease-in-out z-50',
              'border-t-2 border-black shadow-light bg-bg',
              {
                'h-[400px]': isChatOpen,
                'translate-y-0': isChatOpen,
                'translate-y-full': !isChatOpen,
              },
            )}
          >
            {isChatOpen && (
              <EnhancedChatInterface
                tracks={tracks}
                onTracksFilter={handleTracksFilter}
                isOpen={isChatOpen}
                onClose={closeChat}
              />
            )}
          </Card>
        )}

        {/* Chat Toggle Button */}
        <div className="fixed bottom-28 right-6 z-50 flex flex-col items-end space-y-3">
          {/* Quick Info Badge - Only show when closed and has tracks */}
          {!isChatOpen && tracks.length > 0 && (
            <div className="bg-bg border-2 border-black rounded-base px-3 py-2 shadow-light animate-in fade-in-50 slide-in-from-right-2">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-black" />
                <span className="text-sm font-medium text-text">
                  {tracks.length} tracks ready
                </span>
              </div>
            </div>
          )}

          {/* Main Chat Button */}
          <Button
            onClick={toggleChat}
            className={cn(
              'h-14 w-14 rounded-base shadow-light border-2 border-black transition-all duration-200',
              'bg-main hover:bg-mainAccent text-black font-medium',
              'hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none',
              'animate-in fade-in-50 slide-in-from-right-2',
              isChatOpen && 'rotate-180',
            )}
          >
            {isChatOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <MessageCircle className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Keyboard Shortcut Hint - Separate positioned element */}
        {!isChatOpen && (
          <div className="fixed bottom-28 right-24 z-40 hidden lg:block">
            <div className="bg-bg border-2 border-black rounded-base px-3 py-2 shadow-light opacity-80 hover:opacity-100 transition-opacity animate-in fade-in-50 slide-in-from-right-2 delay-300">
              <div className="flex items-center space-x-2 text-xs text-text whitespace-nowrap">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-black rounded-base text-xs font-mono">
                  ⌘/
                </kbd>
                <span>to open chat</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
