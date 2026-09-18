'use client';

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { Plus, Sparkles, ArrowUp, Disc3, LibraryBig } from 'lucide-react';
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
import ReleaseDigCard from './ReleaseDigCard';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface EnhancedChatInterfaceProps {
  tracks: CrateTrack[];
  onTracksFilter: (filteredTracks: CrateTrack[]) => void;
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
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
    const titleWords = suggestion.title.toLowerCase().split(/\s+/);
    const trackTitle = t.title.toLowerCase();
    return titleWords.some(
      (word) => trackTitle.includes(word) && word.length > 2,
    );
  });
  return match || null;
};

const TypingIndicator = () => (
  <div className="flex items-center gap-3 py-3">
    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-accent-foreground">
      <Disc3 className="h-4 w-4" />
    </div>
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="flex gap-1">
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
      </div>
      <span>Digging through your collection…</span>
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
        'crate-turn flex w-full py-1',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'flex w-full max-w-full items-start gap-3',
          isUser && 'flex-row-reverse space-x-reverse',
        )}
      >
        <div className="h-8 w-8 flex-shrink-0">
          {isUser ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-muted text-sm text-foreground">
                {userAvatar?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-background">
              <Disc3 className="h-4 w-4" />
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-3',
            isUser ? 'items-end' : 'items-start',
          )}
        >
          <div
            className={cn(
              'max-w-full break-words text-sm leading-7',
              isUser
                ? 'max-w-[34rem] rounded-[1rem] bg-accent px-4 py-2.5 text-accent-foreground'
                : 'w-full pt-1 text-foreground',
            )}
          >
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
          {!isUser && matchedTracks.length > 0 && (
            <div className="crate-dig-cluster mt-5 w-full max-w-full space-y-3">
              <div className="flex flex-col gap-3 rounded-[1rem] border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    Found {matchedTracks.length} matching tracks
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCreatePlaylist(matchedTracks)}
                  className="h-9 flex-shrink-0 rounded-[0.7rem] text-xs"
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
  initialPrompt,
}: EnhancedChatInterfaceProps) {
  void isOpen;
  void onClose;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = useQuery(api.users.getCurrentUser);
  const { setOrderingConfig } = useTrackSorting(tracks);
  const { togglePlayPause, initializePlayer, setQueue } = usePlayerStore();
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [matchedTracksMap, setMatchedTracksMap] = useState<
    Map<string, CrateTrack[]>
  >(new Map());
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [playlistTracks, setPlaylistTracks] = useState<CrateTrack[]>([]);
  const [input, setInput] = useState(initialPrompt ?? '');
  const [isSending, setIsSending] = useState(false);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const getOrCreateChatThread = useMutation(api.chat.getOrCreateChatThread);
  const sendMessage = useMutation(api.chat.sendMessage);
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrompt) setInput(initialPrompt);
  }, [initialPrompt]);

  const suggestedPrompts = useMemo(() => {
    const genres = tracks.flatMap((track) =>
      Array.isArray(track.genres)
        ? track.genres
        : typeof track.genres === 'string' && track.genres
          ? track.genres.split(',').map((genre) => genre.trim())
          : [],
    );
    const leadingGenre = genres.find(Boolean);
    const bpms = tracks
      .map((track) => track.bpm)
      .filter((bpm): bpm is number => typeof bpm === 'number');
    const centerBpm = bpms.length
      ? Math.round(bpms.reduce((sum, bpm) => sum + bpm, 0) / bpms.length)
      : 124;
    return [
      leadingGenre
        ? `Build a warm-up set from my ${leadingGenre} records`
        : 'Build a warm-up set from my collection',
      `Find a smooth five-track run around ${centerBpm} BPM`,
      'Show me an unexpected transition hiding in my crate',
    ];
  }, [tracks]);

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
    void initializePlayer();
  }, [initializePlayer]);

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
    try {
      const { playingTrackId, isPlaying } = usePlayerStore.getState();
      const isCurrentlyPlaying = playingTrackId === track.id;
      setQueue([track], 0);
      const didStart = await togglePlayPause(track);
      if (!didStart) {
        toast.error('No playable audio found for this track');
        return;
      }
      toast.success(
        `${isCurrentlyPlaying && isPlaying ? 'Paused' : 'Playing'} ${track.title}`,
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
    <div className="flex h-full max-w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="crate-thread mx-auto w-full space-y-3 px-4 py-6 sm:px-6 sm:py-8">
          {uiMessages.length === 0 && (
            <div className="mx-auto flex min-h-full max-w-[42rem] flex-col justify-center py-4 sm:py-10">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span>Personal DJ assistant</span>
              </div>
              <div className="mt-5 max-w-2xl">
                <h1 className="text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-foreground sm:text-5xl">
                  Ask the music you already own.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                  Describe a room, an energy, or a tricky mix-out. Crate digs
                  through your collection and keeps every answer grounded in
                  tracks from your shelves.
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-y border-border/70 py-3 text-[0.7rem] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <LibraryBig className="h-3.5 w-3.5" />
                  {tracks.length.toLocaleString()} tracks ready
                </span>
                <span className="flex items-center gap-1.5">
                  <Disc3 className="h-3.5 w-3.5" />
                  Discogs-grounded
                </span>
              </div>

              {showSuggestions && (
                <div className="mt-8 max-w-full">
                  <p className="eyebrow">Start with a direction</p>
                  <div className="mt-3 grid max-w-full gap-2.5 sm:grid-cols-3">
                    {suggestedPrompts.map((suggestion, index) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="group flex min-h-28 w-full flex-col justify-between rounded-[1rem] border border-border/75 bg-card p-4 text-left shadow-soft transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-float"
                        onClick={() => handleSuggestedPrompt(suggestion)}
                      >
                        <span className="text-[0.65rem] font-semibold tabular-nums text-primary">
                          0{index + 1}
                        </span>
                        <span className="mt-4 text-xs font-medium leading-5 text-foreground">
                          {suggestion}
                        </span>
                      </button>
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

      <div className="sticky bottom-0 z-10 flex-shrink-0 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
        <form
          onSubmit={onSubmit}
          className="crate-thread crate-composer-well mx-auto flex items-center gap-2 p-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for a vibe, BPM lane, or mix-out…"
            disabled={isLoading || !threadId}
            className="h-11 flex-1 rounded-[0.8rem] border-0 bg-transparent text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  disabled={isLoading || !threadId || !input.trim()}
                  size="icon"
                  className="h-10 w-10 flex-shrink-0 rounded-[0.75rem]"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="border border-border bg-popover text-foreground">
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
      />
    </div>
  );
}
