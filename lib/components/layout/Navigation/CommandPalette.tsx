'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowUpRight,
  Disc3,
  Home,
  LibraryBig,
  ListMusic,
  MessageCircle,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils/tailwind';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

export default function CommandPalette({
  isOpen,
  onClose,
}: CommandPaletteProps) {
  const { username } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = useMemo<CommandItem[]>(() => {
    if (!username) return [];
    return [
      {
        id: 'ask',
        title: 'Ask Crate',
        description: 'Find a vibe, BPM lane, or next track',
        keywords: ['assistant', 'chat', 'mix', 'recommend'],
        icon: MessageCircle,
        href: '/analyze/chat',
      },
      {
        id: 'library',
        title: 'Your tracks',
        description: 'Browse the playable tracks in your crate',
        keywords: ['library', 'songs', 'music', 'crate'],
        icon: LibraryBig,
        href: `/${username}/tracks`,
      },
      {
        id: 'discogs',
        title: 'Discogs releases',
        description: 'Browse your synced releases or search Discogs',
        keywords: ['records', 'collection', 'vinyl', 'search'],
        icon: Disc3,
        href: `/${username}/collection`,
      },
      {
        id: 'playlists',
        title: 'Playlists',
        description: 'Open the sets you are shaping',
        keywords: ['sets', 'mixes', 'saved'],
        icon: ListMusic,
        href: `/${username}/playlists`,
      },
      {
        id: 'overview',
        title: 'Overview',
        description: 'Return to your collection overview',
        keywords: ['home', 'dashboard'],
        icon: Home,
        href: `/${username}`,
      },
      {
        id: 'connections',
        title: 'Connections',
        description: 'Manage Discogs and collection sync',
        keywords: ['settings', 'account', 'sync'],
        icon: Settings,
        href: `/${username}/settings/connections`,
      },
    ];
  }, [username]);

  const filteredCommands = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    const terms = needle.split(/\s+/);
    return commands.filter((command) => {
      const haystack = [command.title, command.description, ...command.keywords]
        .join(' ')
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [commands, query]);

  const execute = useCallback(
    (command: CommandItem) => {
      navigate({ to: command.href });
      setQuery('');
      setSelectedIndex(0);
      onClose();
    },
    [navigate, onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIndex(0);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Tab') {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'input, button:not([disabled]):not([tabindex="-1"]), [href], [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((current) =>
          filteredCommands.length ? (current + 1) % filteredCommands.length : 0,
        );
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((current) =>
          filteredCommands.length
            ? (current - 1 + filteredCommands.length) % filteredCommands.length
            : 0,
        );
      } else if (event.key === 'Enter' && filteredCommands[selectedIndex]) {
        event.preventDefault();
        execute(filteredCommands[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [execute, filteredCommands, isOpen, onClose, selectedIndex]);

  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) setSelectedIndex(0);
  }, [filteredCommands.length, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-foreground/25 px-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Jump to a page"
        className="w-full max-w-xl overflow-hidden rounded-[1.35rem] border border-border/80 bg-popover shadow-float animate-in fade-in-0 zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3.5">
          <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            role="combobox"
            aria-label="Search destinations"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={
              filteredCommands[selectedIndex]
                ? `command-${filteredCommands[selectedIndex].id}`
                : undefined
            }
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Where do you want to go?"
            className="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close command menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          id="command-results"
          role="listbox"
          aria-label="Destinations"
          className="max-h-[24rem] overflow-y-auto p-2"
        >
          {filteredCommands.length > 0 ? (
            filteredCommands.map((command, index) => {
              const Icon = command.icon;
              const selected = index === selectedIndex;
              return (
                <button
                  key={command.id}
                  id={`command-${command.id}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onClick={() => execute(command)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                    selected ? 'bg-accent' : 'hover:bg-muted/70',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[0.7rem]',
                      selected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {command.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {command.description}
                    </span>
                  </span>
                  <ArrowUpRight
                    className={cn(
                      'h-4 w-4 flex-shrink-0 transition-opacity',
                      selected
                        ? 'text-accent-foreground opacity-100'
                        : 'text-muted-foreground opacity-0',
                    )}
                  />
                </button>
              );
            })
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold text-foreground">
                Nothing found
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try “tracks”, “Discogs”, or “connections”.
              </p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-border/70 bg-muted/35 px-4 py-2.5 text-[0.65rem] text-muted-foreground">
          <span>Quick navigation</span>
          <span className="flex items-center gap-3">
            <span>↑↓ move</span>
            <span>↵ open</span>
            <span>esc close</span>
          </span>
        </footer>
      </section>
    </div>
  );
}
