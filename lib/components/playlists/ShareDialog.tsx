import { useState } from 'react';
import { Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';
import type {
  PlaylistPlayMode,
  PlaylistVisibility,
  TrackAudioStatus,
} from '@/convex/lib/playlistSharing';
import { Button } from '@/lib/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog';
import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { cn } from '@/lib/utils/tailwind';
import { EMBED_HEIGHT, embedCode, embedUrl, shareUrl } from './share';
import { VISIBILITY_OPTIONS } from './visibility';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlist: {
    _id: Id<'playlists'>;
    title: string;
    visibility: PlaylistVisibility;
    share_id?: string;
    play_mode: PlaylistPlayMode;
    is_favorites?: boolean;
    tracks: Array<{ audio_status?: TrackAudioStatus }>;
  };
}

const PLAY_MODES: Array<{ value: PlaylistPlayMode; label: string }> = [
  { value: 'in_order', label: 'In order' },
  { value: 'shuffle', label: 'Shuffled' },
];

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    copy: async (key: string, text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    },
  };
}

function audioSummary(tracks: ShareDialogProps['playlist']['tracks']) {
  const count = (statuses: TrackAudioStatus[]) =>
    tracks.filter((track) => statuses.includes(track.audio_status ?? 'pending'))
      .length;
  const playable = count(['ready', 'unverified']);
  const pending = count(['pending']);
  const missing = count(['unavailable']);
  if (tracks.length === 0) return null;
  if (playable === tracks.length) return 'Every track has audio.';
  return [
    `${playable} of ${tracks.length} tracks have audio.`,
    pending > 0 && `${pending} still being matched.`,
    missing > 0 &&
      `${missing} ${missing === 1 ? 'has' : 'have'} no match on YouTube, so listeners skip ${missing === 1 ? 'it' : 'them'}.`,
  ]
    .filter(Boolean)
    .join(' ');
}

export function ShareDialog({
  open,
  onOpenChange,
  playlist,
}: ShareDialogProps) {
  const { setPlaylistVisibility, resetPlaylistLink, updatePlaylist } =
    usePlaylists();
  const { copied, copy } = useCopy();
  const [isSaving, setIsSaving] = useState(false);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const isShared = playlist.visibility !== 'private';
  const shareId = playlist.share_id;
  const summary = audioSummary(playlist.tracks);

  const changeVisibility = async (visibility: PlaylistVisibility) => {
    if (visibility === playlist.visibility || isSaving) return;
    setIsSaving(true);
    try {
      await setPlaylistVisibility(playlist._id, visibility);
    } finally {
      setIsSaving(false);
    }
  };

  const resetLink = async () => {
    const confirmed = window.confirm(
      'Reset the link? The current link and embed code will stop working.',
    );
    if (confirmed) await resetPlaylistLink(playlist._id);
  };

  const changePlayMode = async (play_mode: PlaylistPlayMode) => {
    if (play_mode === playlist.play_mode) return;
    await updatePlaylist(playlist._id, { play_mode });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl tracking-tight">
            Share “{playlist.title}”
          </DialogTitle>
          <DialogDescription>
            Choose who can listen, then send the link or embed the player on
            your site.
          </DialogDescription>
        </DialogHeader>

        <section aria-labelledby="share-visibility">
          <h3
            id="share-visibility"
            className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Who can listen
          </h3>
          {playlist.is_favorites ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Favorites stay private.
            </p>
          ) : (
            <div role="radiogroup" className="mt-2 grid gap-2">
              {(
                Object.entries(VISIBILITY_OPTIONS) as Array<
                  [
                    PlaylistVisibility,
                    (typeof VISIBILITY_OPTIONS)[PlaylistVisibility],
                  ]
                >
              ).map(([value, option]) => {
                const selected = playlist.visibility === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={isSaving}
                    onClick={() => void changeVisibility(value)}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary/[0.05]'
                        : 'border-border/70 hover:bg-muted/50',
                    )}
                  >
                    <option.icon
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        selected ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="share-play-mode" className="mt-2">
          <h3
            id="share-play-mode"
            className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Listeners hear it
          </h3>
          <div
            role="radiogroup"
            className="mt-2 inline-flex rounded-full border border-border/70 p-1"
          >
            {PLAY_MODES.map((mode) => {
              const selected = playlist.play_mode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => void changePlayMode(mode.value)}
                  className={cn(
                    'h-8 rounded-full px-4 text-sm font-medium transition-colors',
                    selected
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Listeners can still switch shuffle on or off. The embed loops when
            it reaches the end.
          </p>
        </section>

        {isShared && shareId && (
          <>
            <section aria-labelledby="share-link" className="mt-2">
              <h3
                id="share-link"
                className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Link
              </h3>
              <div className="mt-2 flex gap-2">
                <input
                  readOnly
                  value={shareUrl(origin, shareId)}
                  onFocus={(event) => event.currentTarget.select()}
                  aria-label="Playlist link"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-muted/40 px-3 font-mono text-xs text-foreground"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => void copy('link', shareUrl(origin, shareId))}
                >
                  {copied === 'link' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="ml-2">Copy</span>
                </Button>
                <a
                  href={shareUrl(origin, shareId)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open the public page"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border transition-colors hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </section>

            <section aria-labelledby="share-embed" className="mt-2">
              <div className="flex items-end justify-between">
                <h3
                  id="share-embed"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Embed on your site
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg"
                  onClick={() =>
                    void copy(
                      'embed',
                      embedCode(origin, shareId, playlist.title),
                    ).then(() => toast.success('Embed code copied'))
                  }
                >
                  {copied === 'embed' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1.5">Copy code</span>
                </Button>
              </div>
              <textarea
                readOnly
                rows={3}
                value={embedCode(origin, shareId, playlist.title)}
                onFocus={(event) => event.currentTarget.select()}
                aria-label="Embed code"
                className="mt-2 w-full resize-none rounded-xl border border-input bg-muted/40 px-3 py-2 font-mono text-[11px] leading-5 text-foreground"
              />
              <iframe
                src={embedUrl(origin, shareId)}
                title={`${playlist.title} embed preview`}
                height={EMBED_HEIGHT}
                className="mt-3 w-full rounded-2xl border-0 bg-muted"
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            </section>

            <div className="mt-2 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-muted-foreground">
                {summary}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                onClick={() => void resetLink()}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Reset link
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
