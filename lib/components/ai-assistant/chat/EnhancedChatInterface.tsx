'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import {
  Send,
  Bot,
  Music,
  Play,
  Pause,
  Plus,
  Sparkles,
  MoreVertical,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/lib/components/ui/button';
import { Input } from '@/lib/components/ui/input';
import { Card, CardContent } from '@/lib/components/ui/card';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/lib/components/ui/dropdown-menu';
import { CrateTrack } from '@/lib/types';
import { useChat } from 'ai/react';
import { cn } from '@/lib/utils/tailwind';
import { usePlayerStore } from '@/lib/stores';
import { useTrackSorting } from '@/lib/hooks/useTrackSorting';
import { toast } from 'sonner';
import PlaylistCreationModal from './PlaylistCreationModal';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface EnhancedChatInterfaceProps {
  tracks: CrateTrack[];
  onTracksFilter: (filteredTracks: CrateTrack[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedTrack {
  title: string;
  artist: string;
  bpm?: number;
  genre?: string;
}

interface TrackSuggestion {
  tracks: ParsedTrack[];
  explanation: string;
  context: string;
}

// Enhanced track parsing with multiple format support
const parseTracksFromMessage = (content: string): TrackSuggestion | null => {
  try {
    // Try to parse JSON response first
    if (content.includes('{') && content.includes('}')) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tracks) return parsed;
      }
    }

    // Fallback to regex parsing
    const trackMatches = content.matchAll(
      /["'](.+?)["']\s*-\s*(.+?)\s*(?:\(|$)(\d+)?\s*(?:BPM)?(?:\)|$)/gi,
    );
    const tracks = Array.from(trackMatches).map((match) => ({
      title: match[1].trim(),
      artist: match[2].trim(),
      bpm: match[3] ? parseInt(match[3]) : undefined,
    }));

    if (tracks.length > 0) {
      return {
        tracks,
        explanation: content,
        context: 'track_suggestions',
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to parse tracks:', error);
    return null;
  }
};

// Enhanced track matching with fuzzy search
const findMatchingTrack = (
  suggestion: ParsedTrack,
  tracks: CrateTrack[],
): CrateTrack | null => {
  // Exact title match
  let match = tracks.find(
    (t) =>
      t.title.toLowerCase().trim() === suggestion.title.toLowerCase().trim(),
  );

  if (match) return match;

  // Artist + title match
  match = tracks.find(
    (t) =>
      t.title.toLowerCase().includes(suggestion.title.toLowerCase()) &&
      t.artist.toLowerCase().includes(suggestion.artist.toLowerCase()),
  );

  if (match) return match;

  // Fuzzy title match
  match = tracks.find((t) => {
    const titleWords = suggestion.title.toLowerCase().split(' ');
    const trackTitle = t.title.toLowerCase();
    return titleWords.some(
      (word) => trackTitle.includes(word) && word.length > 2,
    );
  });

  return match || null;
};

// Suggested prompts for better user guidance
const SUGGESTED_PROMPTS = [
  'Find tracks around 128 BPM for a house set',
  'Suggest tracks that mix well with techno',
  'Show me tracks for a chill downtempo session',
  'Find high-energy tracks above 140 BPM',
  'What tracks work well for peak time?',
  'Suggest tracks with similar vibes to deep house',
];

const TypingIndicator = () => (
  <div className="flex items-center space-x-2 p-4">
    <div className="w-8 h-8 bg-main border-2 border-black rounded-base flex items-center justify-center">
      <Bot className="w-4 h-4 text-black" />
    </div>
    <div className="flex items-center space-x-1 bg-white border-2 border-black rounded-base px-4 py-2 shadow-light">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-mainAccent rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 bg-mainAccent rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 bg-mainAccent rounded-full animate-bounce" />
      </div>
      <span className="text-sm text-text ml-2 font-medium">
        DJ Assistant is thinking...
      </span>
    </div>
  </div>
);

const TrackCard = ({
  track,
  onPlay,
  onAddToPlaylist,
}: {
  track: CrateTrack;
  onPlay: () => void;
  onAddToPlaylist: () => void;
}) => {
  const { isPlaying, playingTrackId, isReady } = usePlayerStore();
  const isCurrentlyPlaying = playingTrackId === track.id && isPlaying;
  const hasAudio = track.youtube_video_id;

  return (
    <Card className="mb-4 transition-all border-2 border-black rounded-base shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none bg-white w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="w-12 h-12 bg-mainAccent border-2 border-black rounded-base flex items-center justify-center flex-shrink-0">
              <Music className="w-6 h-6 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate text-text font-heading mb-1">
                {track.title}
              </h4>
              <p className="text-xs text-gray-600 truncate mb-2">
                {track.artist}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {track.bpm && (
                  <span className="bg-white border border-black text-xs px-2 py-1 rounded-base text-text font-mono">
                    {track.bpm} BPM
                  </span>
                )}
                {track.genres && track.genres.length > 0 && (
                  <span className="border border-black text-xs px-2 py-1 rounded-base text-text">
                    {track.genres[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={onPlay}
              disabled={!hasAudio || !isReady}
              className={cn(
                'h-8 w-8 p-0 border border-black rounded-base transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none shadow-light',
                hasAudio && isReady
                  ? 'bg-main hover:bg-mainAccent'
                  : 'bg-gray-200 cursor-not-allowed',
              )}
            >
              {isCurrentlyPlaying ? (
                <Pause className="w-4 h-4 text-black" />
              ) : (
                <Play className="w-4 h-4 text-black" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 bg-white hover:bg-bg border border-black rounded-base transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none shadow-light"
                >
                  <MoreVertical className="w-4 h-4 text-black" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-bg border-2 border-black rounded-base shadow-light"
              >
                <DropdownMenuItem
                  onClick={onAddToPlaylist}
                  className="hover:bg-main text-text"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Playlist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MessageBubble = ({
  message,
  userAvatar,
  matchedTracks = [],
  onTrackPlay,
  onTrackAddToPlaylist,
  onCreatePlaylist,
}: {
  message: any;
  userAvatar?: string;
  matchedTracks?: CrateTrack[];
  onTrackPlay: (track: CrateTrack) => void;
  onTrackAddToPlaylist: (track: CrateTrack) => void;
  onCreatePlaylist: (tracks: CrateTrack[]) => void;
}) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-8 w-full`}
    >
      <div
        className={`flex items-start space-x-4 max-w-full ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
      >
        <div className="w-8 h-8 flex-shrink-0">
          {isUser ? (
            <Avatar className="w-8 h-8">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-mainAccent text-black border-2 border-black text-sm">
                {userAvatar?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8 h-8 bg-main border-2 border-black rounded-base flex items-center justify-center">
              <Bot className="w-4 h-4 text-black" />
            </div>
          )}
        </div>

        <div
          className={`space-y-3 ${isUser ? 'items-end' : 'items-start'} flex flex-col flex-1 min-w-0`}
        >
          <div
            className={cn(
              'rounded-base px-4 py-3 max-w-full break-words border-2 border-black shadow-light',
              isUser ? 'bg-main text-text' : 'bg-white text-text',
            )}
          >
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
          </div>

          {/* Track suggestions */}
          {!isUser && matchedTracks.length > 0 && (
            <div className="w-full space-y-3 max-w-full">
              <div className="flex items-center justify-between p-3 bg-bg border-2 border-black rounded-base">
                <div className="flex items-center space-x-2 text-sm text-text">
                  <Sparkles className="w-4 h-4 text-mainAccent2" />
                  <span className="font-medium">
                    Found {matchedTracks.length} matching tracks
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCreatePlaylist(matchedTracks)}
                  className="h-8 text-xs bg-main hover:bg-mainAccent border-2 border-black text-text shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all flex-shrink-0"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Create Playlist
                </Button>
              </div>
              <div className="space-y-3 max-w-full overflow-hidden">
                {matchedTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    onPlay={() => onTrackPlay(track)}
                    onAddToPlaylist={() => onTrackAddToPlaylist(track)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function EnhancedChatInterface({
  tracks,
  onTracksFilter,
  isOpen,
  onClose,
}: EnhancedChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = useQuery(api.users.getCurrentUser);
  const { setOrderingConfig } = useTrackSorting(tracks);
  const { togglePlayPause, initializePlayer, isReady } = usePlayerStore();
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [matchedTracksMap, setMatchedTracksMap] = useState<
    Map<string, CrateTrack[]>
  >(new Map());
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [playlistTracks, setPlaylistTracks] = useState<CrateTrack[]>([]);

  // Initialize player when component mounts
  useEffect(() => {
    if (!isReady) {
      initializePlayer();
    }
  }, [initializePlayer, isReady]);

  const processTrackSuggestions = useCallback(
    (content: string, messageId: string) => {
      try {
        const suggestion = parseTracksFromMessage(content);
        if (suggestion) {
          const matchedTracks = suggestion.tracks
            .map((track) => findMatchingTrack(track, tracks))
            .filter(Boolean) as CrateTrack[];

          if (matchedTracks.length > 0) {
            setMatchedTracksMap(
              (prev) => new Map(prev.set(messageId, matchedTracks)),
            );
            setOrderingConfig({ orderBy: 'suggested', direction: 'asc' });
            onTracksFilter(matchedTracks);
            toast.success(
              `Found ${matchedTracks.length} matching tracks in your collection`,
            );
          } else {
            toast.error('No matching tracks found in your collection');
          }
        }
      } catch (error) {
        console.error('Failed to process track suggestions:', error);
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
        processTrackSuggestions(message.content, message.id);
      },
      onError: (error) => {
        console.error('Chat error:', error);
        toast.error('Failed to get AI response. Please try again.');
      },
    });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSuggestedPrompt = (prompt: string) => {
    handleInputChange({ target: { value: prompt } } as any);
    setShowSuggestions(false);
  };

  const handleTrackPlay = async (track: CrateTrack) => {
    if (!isReady) {
      toast.error('Player is still loading...');
      return;
    }

    if (!track.youtube_video_id) {
      toast.error('No audio available for this track');
      return;
    }

    try {
      const { playingTrackId } = usePlayerStore.getState();
      const isCurrentlyPlaying = playingTrackId === track.id;
      togglePlayPause(track);
      toast.success(
        `${isCurrentlyPlaying ? 'Pausing' : 'Playing'} ${track.title}`,
      );
    } catch (error) {
      console.error('Error playing track:', error);
      toast.error('Failed to play track');
    }
  };

  const handleTrackAddToPlaylist = (track: CrateTrack) => {
    setPlaylistTracks([track]);
    setPlaylistModalOpen(true);
  };

  const handleCreatePlaylistFromSuggestions = (tracks: CrateTrack[]) => {
    setPlaylistTracks(tracks);
    setPlaylistModalOpen(true);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      setShowSuggestions(false);
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg max-w-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b-2 border-black bg-bg flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-main border-2 border-black rounded-base flex items-center justify-center shadow-light flex-shrink-0">
              <Bot className="w-5 h-5 text-black" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm text-text font-heading">
                DJ Assistant
              </h2>
              <p className="text-xs text-gray-600">
                {tracks.length} tracks loaded • Ready to help
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-mainAccent border border-black rounded-base flex-shrink-0"
          >
            <MoreVertical className="w-4 h-4 text-black" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 space-y-2 max-w-full">
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="mb-10">
              <MessageBubble
                message={{
                  role: 'assistant',
                  content: `Hey there! 👋 I'm your AI DJ assistant. I can help you find perfect tracks for your sets, suggest mixing ideas, and analyze your collection.\n\nI know about all ${tracks.length} tracks in your library. What would you like to explore today?`,
                }}
                matchedTracks={[]}
                onTrackPlay={handleTrackPlay}
                onTrackAddToPlaylist={handleTrackAddToPlaylist}
                onCreatePlaylist={handleCreatePlaylistFromSuggestions}
              />

              {/* Suggested prompts */}
              {showSuggestions && (
                <div className="space-y-4 mt-8 max-w-full">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Sparkles className="w-4 h-4 text-mainAccent2" />
                    <span className="font-medium">Try asking me about:</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 max-w-full">
                    {SUGGESTED_PROMPTS.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="h-auto p-4 text-left justify-start text-wrap bg-white hover:bg-main border-2 border-black rounded-base shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all text-text w-full"
                        onClick={() => handleSuggestedPrompt(prompt)}
                      >
                        <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
                        <span className="text-sm text-left">{prompt}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat messages */}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              userAvatar={user?.avatarUrl}
              matchedTracks={matchedTracksMap.get(message.id) || []}
              onTrackPlay={handleTrackPlay}
              onTrackAddToPlaylist={handleTrackAddToPlaylist}
              onCreatePlaylist={handleCreatePlaylistFromSuggestions}
            />
          ))}

          {/* Typing indicator */}
          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t-2 border-black bg-bg flex-shrink-0 sticky bottom-0 z-10">
        <form onSubmit={onSubmit} className="flex space-x-3">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about tracks, mixing tips, or BPM matching..."
            disabled={isLoading}
            className="flex-1 border-2 border-black bg-white focus:ring-main focus:border-main text-text h-11 rounded-base"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="h-11 px-4 bg-main hover:bg-mainAccent border-2 border-black text-text shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all flex-shrink-0 rounded-base"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-bg border-2 border-black text-text">
                <p>Send message</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>
      </div>

      {/* Playlist Creation Modal */}
      <PlaylistCreationModal
        isOpen={playlistModalOpen}
        onClose={() => setPlaylistModalOpen(false)}
        suggestedTracks={playlistTracks}
        onPlaylistCreated={(playlistId) => {
          toast.success('Playlist created successfully!');
        }}
      />
    </div>
  );
}
