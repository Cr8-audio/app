'use client';

import { useCallback, useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import { Button } from '@/lib/components/ui/button';
import { Input } from '@/lib/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/lib/components/ui/tooltip';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/lib/components/ui/avatar';
import { CrateTrack } from '@/lib/types';
import { ChatLoader } from '@/components/ai-assistant/components/chat/ChatLoader';
import { useChat } from 'ai/react';
import { cn } from '@/lib/utils/tailwind';
import { useTrackSorting } from '@/lib/hooks/useTrackSorting';
import { toast } from 'sonner';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface ChatInterfaceProps {
  tracks: CrateTrack[];
  onTracksFilter: (filteredTracks: CrateTrack[]) => void;
}

interface ParsedTrack {
  title: string;
  artist: string;
  bpm: number;
}

const findMatchingTrack = (suggestion: ParsedTrack, tracks: CrateTrack[]) => {
  // First try exact title match
  let match = tracks.find(
    (t) => t.title.toLowerCase() === suggestion.title.toLowerCase(),
  );

  // If no exact match, try fuzzy matching
  if (!match) {
    match = tracks.find(
      (t) =>
        t.title.toLowerCase().includes(suggestion.title.toLowerCase()) ||
        suggestion.title.toLowerCase().includes(t.title.toLowerCase()),
    );
  }

  return match;
};

const parseTracksFromMessage = (content: string): ParsedTrack[] => {
  const matches = content.matchAll(
    /["'](.+?)["']\s*-\s*(.+?)\s*(?:\(|$$)(\d+)\s*BPM(?:\)|$$)/g,
  );
  return Array.from(matches).map((match) => ({
    title: match[1].trim(),
    artist: match[2].trim(),
    bpm: parseInt(match[3]),
  }));
};

export default function ChatInterface({
  tracks,
  onTracksFilter,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = useQuery(api.users.getCurrentUser);
  const { setOrderingConfig } = useTrackSorting(tracks);

  const processTrackSuggestions = useCallback(
    (content: string) => {
      try {
        const suggestedTracks = parseTracksFromMessage(content);
        if (suggestedTracks.length > 0) {
          const matchedTracks = suggestedTracks
            .map((suggestion) => findMatchingTrack(suggestion, tracks))
            .filter(Boolean) as CrateTrack[];

          if (matchedTracks.length > 0) {
            // Update the ordering config to show suggested tracks
            setOrderingConfig({ orderBy: 'suggested', direction: 'asc' });
            // Call the filter callback with matched tracks
            onTracksFilter(matchedTracks);
            toast.success(`Found ${matchedTracks.length} matching tracks`);
          } else {
            toast.error('No matching tracks found in your collection');
          }
        }
      } catch (e) {
        console.error('Failed to process track suggestions:', e);
        toast.error('Failed to process track suggestions');
      }
    },
    [tracks, onTracksFilter, setOrderingConfig],
  );

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: '/api/ai/chat',
      body: {
        tracks: tracks.map((track) => ({
          title: track.title,
          artist: track.artist,
          bpm: track.bpm,
          genres: track.genres,
        })),
      },
      onFinish: (message) => {
        processTrackSuggestions(message.content);
      },
      onError: (error) => {
        console.error('Chat error:', error);
        toast.error('Failed to get AI response');
      },
    });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit(e);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-[120px]">
        <div className="flex flex-col gap-4 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-start gap-2 max-w-[80%]">
                {message.role === 'assistant' && (
                  <Avatar>
                    <AvatarImage src="/ai-avatar.png" alt="AI" />
                    <AvatarFallback>
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'rounded-lg p-3 shadow-sm border transition-colors',
                    message.role === 'user'
                      ? 'bg-primary/10 border-primary/20 text-primary-foreground ml-auto hover:bg-primary/15'
                      : 'bg-muted/50 border-muted-foreground/20 text-foreground hover:bg-muted/60',
                  )}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                {message.role === 'user' && (
                  <Avatar>
                    <AvatarImage src={user?.avatarUrl} alt="User" />
                    <AvatarFallback>{user?.username?.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          ))}
          {isLoading && <ChatLoader />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border">
        <form onSubmit={onSubmit} className="flex gap-2 max-w-[1200px] mx-auto">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about tracks, mixing suggestions..."
            disabled={isLoading}
            className="min-h-10"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" disabled={isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isLoading ? 'Thinking...' : 'Send message'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>
      </div>
    </div>
  );
}
