'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import {
  Send,
  Bot,
  Plus,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
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
import { extractText } from '@convex-dev/agent';
import { toUIMessages, useThreadMessages } from '@convex-dev/agent/react';
import { cn } from '@/lib/utils/tailwind';
import { usePlayerStore } from '@/lib/stores';
import { useTrackSorting } from '@/lib/hooks/useTrackSorting';
import { toast } from 'sonner';
import PlaylistCreationModal from './PlaylistCreationModal';
import ReleaseDigCard, { STUB_RELEASE_DIG } from './ReleaseDigCard';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface EnhancedChatInterfaceProps {
  tracks: CrateTrack[];
  onTracksFilter: (filteredTracks: CrateTrack[]) => void;
  isOpen: boolean;
  onClose: () => void;
  /** nocturnal = chat-home void surface (default for wedge) */
  variant?: 'default' | 'nocturnal';
}

interface ParsedTrack {
  title: string;
  artist: string;
  bpm?: number;
}

const parseTracksFromMessage = (content: string) => {
  try {
    if (content.includes('{') && content.includes('}')) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tracks) return parsed as { tracks: ParsedTrack[] };
      }
    }
    const trackMatches = content.matchAll(
      /["'](.+?)["']\s*-\s*(.+?)\s*(?:\(|$)(\d+)?\s*(?:BPM)?(?:\)|$)/gi,
    );
    const tracks = Array.from(trackMatches).map((match) => ({
      title: match[1].trim(),
      artist: match[2].trim(),
      bpm: match[3] ? parseInt(match[3]) : undefined,
    }));
    return tracks.length > 0 ? { tracks } : null;
  } catch (error) {
    console.error('Failed to parse tracks:', error);
    return null;
  }
};

const findMatchingTrack = (
  suggestion: ParsedTrack,
  tracks: CrateTrack[],
): CrateTrack | null => {
  let match = tracks.find(
    (t) =>
      t.title.toLowerCase().trim() === suggestion.title.toLowerCase().trim(),
  );
  if (match) return match;
  match = tracks.find(
    (t) =>
      t.title.toLowerCase().includes(suggestion.title.toLowerCase()) &&
      t.artist.toLowerCase().includes(suggestion.artist.toLowerCase()),
  );
  if (match) return match;
  match = tracks.find((t) => {
    const titleWords = suggestion.title.toLowerCase().split(' ');
    const trackTitle = t.title.toLowerCase();
    return titleWords.some(
      (word) => trackTitle.includes(word) && word.length > 2,
    );
  });
  return match || null;
};

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
    <div className="flex h-8 w-8 items-center justify-center rounded-base border border-[var(--crate-rule)] bg-[var(--crate-panel-raised)]">
      <Bot className="h-4 w-4 text-[var(--crate-accent)]" />
    </div>
    <div className="flex items-center space-x-1 rounded-xl border border-[var(--crate-rule)] bg-[var(--crate-panel)] px-4 py-2">
      <div className="flex space-x-1">
        <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--crate-accent)] [animation-delay:-0.3s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--crate-accent)] [animation-delay:-0.15s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--crate-accent)]" />
      </div>
      <span className="ml-2 text-sm font-medium text-[var(--crate-ink-muted)]">
        Digging…
      </span>
    </div>
  </div>
);

const MessageBubble = ({
  message,
  userAvatar,
  matchedTracks = [],
  onTrackPlay,
  onTrackAddToPlaylist,
  onCreatePlaylist,
}: {
  message: { role: string; content: string; id?: string };
  userAvatar?: string;
  matchedTracks?: CrateTrack[];
  onTrackPlay: (track: CrateTrack) => void;
  onTrackAddToPlaylist: (track: CrateTrack) => void;
  onCreatePlaylist: (tracks: CrateTrack[]) => void;
}) => {
  const isUser = message.role === 'user';
  return (
    <div
      className={cn(
        'crate-turn flex w-full',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'flex max-w-full items-start space-x-4',
          isUser && 'flex-row-reverse space-x-reverse',
        )}
      >
        <div className="h-8 w-8 flex-shrink-0">
          {isUser ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="border border-[var(--crate-rule)] bg-[var(--crate-panel-raised)] text-sm text-[var(--crate-ink)]">
                {userAvatar?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-base border border-[var(--crate-rule)] bg-[var(--crate-panel-raised)]">
              <Bot className="h-4 w-4 text-[var(--crate-accent)]" />
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col space-y-3',
            isUser ? 'items-end' : 'items-start',
          )}
        >
          <div
            className={cn(
              'max-w-full break-words rounded-xl border border-[var(--crate-rule)] px-4 py-3',
              isUser
                ? 'bg-[var(--crate-panel-raised)] text-[var(--crate-ink)]'
                : 'bg-[var(--crate-panel)] text-[var(--crate-ink)]',
            )}
          >
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
          </div>
          {!isUser && matchedTracks.length > 0 && (
            <div className="crate-dig-cluster mt-5 w-full max-w-full space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-[var(--crate-rule)] bg-[var(--crate-panel-raised)] p-3">
                <div className="flex items-center space-x-2 text-sm text-[var(--crate-ink)]">
                  <Sparkles className="h-4 w-4 text-[var(--crate-accent)]" />
                  <span className="font-medium">
                    Found {matchedTracks.length} matching tracks
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCreatePlaylist(matchedTracks)}
                  className="h-8 flex-shrink-0 rounded-full border border-[var(--crate-rule)] bg-[var(--crate-accent)] text-xs text-[var(--crate-void)] shadow-none hover:translate-x-0 hover:translate-y-0 hover:brightness-110"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Create Playlist
                </Button>
              </div>
              <div className="max-w-full space-y-3 overflow-hidden">
                {matchedTracks.map((track) => (
                  <ReleaseDigCard
                    key={track.id}
                    release={{
                      title: track.title,
                      artist: track.artist,
                      sleeveUrl:
                        (track as { artwork?: string }).artwork ?? null,
                      bpm: track.bpm ?? undefined,
                      discogsId: (
                        track as { discogs_release_id?: string | number }
                      ).discogs_release_id,
                    }}
                    onPlay={() => onTrackPlay(track)}
                    onOpenFocus={() => onTrackAddToPlaylist(track)}
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
  variant = 'nocturnal',
}: EnhancedChatInterfaceProps) {
  void isOpen;
  void onClose;
  void variant;
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
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const getOrCreateChatThread = useMutation(api.chat.getOrCreateChatThread);
  const sendMessage = useMutation(api.chat.sendMessage);
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { threadId: id } = await getOrCreateChatThread({});
        if (!cancelled) setThreadId(id);
      } catch (error) {
        console.error('Failed to get/create chat thread:', error);
        toast.error('Failed to load chat thread');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getOrCreateChatThread]);

  useEffect(() => {
    if (!isReady) initializePlayer();
  }, [initializePlayer, isReady]);

  const processTrackSuggestions = useCallback(
    (content: string, messageId: string) => {
      try {
        const suggestion = parseTracksFromMessage(content);
        if (!suggestion) return;
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
      } catch (error) {
        console.error('Failed to process track suggestions:', error);
        toast.error('Failed to process track suggestions');
      }
    },
    [tracks, onTracksFilter, setOrderingConfig],
  );

  const { results: threadMessages, status: messagesStatus } = useThreadMessages(
    api.chat.listThreadMessages,
    threadId ? { threadId } : 'skip',
    { initialNumItems: 50, stream: true },
  );
  const uiMessages = toUIMessages(threadMessages ?? []);
  const isLoading =
    isSending ||
    messagesStatus === 'LoadingFirstPage' ||
    (threadMessages ?? []).some(
      (m) => m.status === 'pending' || m.streaming === true,
    );

  useEffect(() => {
    for (const msg of threadMessages ?? []) {
      if (
        msg.status === 'success' &&
        msg.message?.role === 'assistant' &&
        !processedMessageIds.current.has(msg._id)
      ) {
        processedMessageIds.current.add(msg._id);
        const content = msg.message ? extractText(msg.message) : undefined;
        if (content) processTrackSuggestions(content, msg._id);
      }
    }
  }, [threadMessages, processTrackSuggestions]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => {
    scrollToBottom();
  }, [uiMessages, isLoading, scrollToBottom]);

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
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

  const handleCreatePlaylistFromSuggestions = (list: CrateTrack[]) => {
    setPlaylistTracks(list);
    setPlaylistModalOpen(true);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !threadId || isLoading) return;
    setShowSuggestions(false);
    setIsSending(true);
    setInput('');
    try {
      await sendMessage({
        threadId,
        prompt: trimmed,
        tracks: tracks.map((track) => ({
          title: track.title,
          artist: track.artist,
          bpm: typeof track.bpm === 'number' ? track.bpm : undefined,
          genres: Array.isArray(track.genres)
            ? track.genres
            : typeof track.genres === 'string' && track.genres
              ? track.genres.split(',').map((g: string) => g.trim())
              : undefined,
        })),
      });
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get AI response. Please try again.');
      setInput(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full max-w-full flex-col overflow-hidden bg-[var(--crate-void)] text-[var(--crate-ink)]">
      <div className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="crate-thread mx-auto w-full max-w-[42rem] space-y-3 p-4">
          {uiMessages.length === 0 && (
            <div className="mb-6 space-y-5">
              <div className="space-y-2">
                <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--crate-ink)]">
                  Dig the crate
                </h1>
                <p className="text-sm leading-relaxed text-[var(--crate-ink-muted)]">
                  One composer. Discogs as ground truth. Ask for a vibe, BPM
                  lane, or mix-out — results land as dig cards in this thread.
                </p>
                <p className="font-mono text-xs text-[var(--crate-ink-muted)]">
                  {tracks.length} tracks ready
                </p>
              </div>
              <div className="crate-dig-cluster space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--crate-ink-muted)]">
                  Dig card · stub
                </p>
                <ReleaseDigCard
                  release={STUB_RELEASE_DIG}
                  onPlay={() =>
                    toast.message('Play stub — wire to player in #140')
                  }
                  onOpenFocus={() =>
                    toast.message('Focus panel stub — coming with dig cards')
                  }
                />
              </div>
              {showSuggestions && (
                <div className="mt-5 max-w-full space-y-4">
                  <div className="flex items-center space-x-2 text-sm text-[var(--crate-ink-muted)]">
                    <Sparkles className="h-4 w-4 text-[var(--crate-accent)]" />
                    <span className="font-medium">Suggested dig</span>
                  </div>
                  <div className="grid max-w-full grid-cols-1 gap-3">
                    {SUGGESTED_PROMPTS.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="h-auto w-full justify-start rounded-xl border border-[var(--crate-rule)] bg-[var(--crate-panel)] p-4 text-left text-wrap text-[var(--crate-ink)] shadow-none transition-all hover:translate-x-0 hover:translate-y-0 hover:bg-[var(--crate-accent-soft)]"
                        onClick={() => handleSuggestedPrompt(prompt)}
                      >
                        <MessageSquare className="mr-3 h-4 w-4 flex-shrink-0" />
                        <span className="text-left text-sm">{prompt}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {uiMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={{
                id: message.id,
                role: message.role,
                content:
                  typeof message.content === 'string' ? message.content : '',
              }}
              userAvatar={user?.avatarUrl}
              matchedTracks={matchedTracksMap.get(message.id) || []}
              onTrackPlay={handleTrackPlay}
              onTrackAddToPlaylist={handleTrackAddToPlaylist}
              onCreatePlaylist={handleCreatePlaylistFromSuggestions}
            />
          ))}

          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex-shrink-0 border-t border-[var(--crate-rule)] bg-[var(--crate-void)] p-4">
        <form
          onSubmit={onSubmit}
          className="crate-thread crate-composer-well mx-auto flex max-w-[42rem] space-x-3 p-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Dig a BPM, vibe, or mix-out…"
            disabled={isLoading || !threadId}
            className="h-11 flex-1 rounded-[var(--radius-composer)] border-0 bg-transparent text-[var(--crate-ink)] placeholder:text-[var(--crate-ink-muted)] focus-visible:ring-1 focus-visible:ring-[var(--crate-accent)]"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  disabled={isLoading || !threadId || !input.trim()}
                  className="crate-play-affordance h-11 flex-shrink-0 rounded-full border-0 bg-[var(--crate-accent)] px-4 text-[var(--crate-void)] shadow-none transition-all duration-150 ease-out hover:translate-x-0 hover:translate-y-0 hover:brightness-110 active:scale-[0.96]"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="border border-[var(--crate-rule)] bg-[var(--crate-panel)] text-[var(--crate-ink)]">
                <p>Send message</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>
      </div>

      <PlaylistCreationModal
        isOpen={playlistModalOpen}
        onClose={() => setPlaylistModalOpen(false)}
        suggestedTracks={playlistTracks}
        onPlaylistCreated={() => {
          toast.success('Playlist created successfully!');
        }}
      />
    </div>
  );
}
