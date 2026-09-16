'use client';

import { useState, ReactNode, useEffect, useMemo } from 'react';
import { X, Sparkles, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/lib/components/ui/button';
import { Card } from '@/lib/components/ui/card';
import { cn } from '@/lib/utils/tailwind';
import ChatInterface from '@/components/ai-assistant/components/chat/ChatInterface';
import { CrateTrack } from '@/lib/types';
import ErrorBoundary from '@/lib/components/Error/ErrorBoundary';
import { toast } from 'sonner';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface AiLayoutProps {
  children: ReactNode;
}

export default function AiLayout({ children }: AiLayoutProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

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

  const handleTracksFilter = (filteredTracks: CrateTrack[]) => {
    if (filteredTracks.length > 0) {
      toast.success(`Found ${filteredTracks.length} matching tracks`);
    }
  };

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen">
        <div
          className={cn(
            'transition-all duration-300 ease-in-out pb-20 min-h-screen',
            {
              'lg:mr-[350px] xl:mr-[400px]': isChatOpen,
              'mr-0': !isChatOpen,
            },
          )}
        >
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            children
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          className={cn(
            'fixed bottom-28 right-6 h-12 w-12 rounded-base shadow-light z-50',
            'bg-main hover:bg-mainAccent border-2 border-black text-black transition-all duration-200',
            'hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none',
            isChatOpen && 'rotate-180',
          )}
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          {isChatOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Sparkles className="h-6 w-6" />
          )}
        </Button>

        <Card
          className={cn(
            'fixed right-0 transition-all duration-300 ease-in-out',
            'border-l-2 border-black shadow-light bg-bg',
            'top-16 bottom-20 z-40',
            {
              'w-full sm:w-[350px] xl:w-[400px]': isChatOpen,
              'translate-x-0': isChatOpen,
              'translate-x-full': !isChatOpen,
            },
          )}
        >
          <div className="flex flex-col h-full">
            <div className="border-b p-4 flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary animate-pulse" />
                <h2 className="text-lg font-semibold">DJ Assistant</h2>
                <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
              </div>
            </div>

            <ChatInterface
              tracks={tracks}
              onTracksFilter={handleTracksFilter}
            />
          </div>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
