'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { cn } from '@/lib/utils/tailwind';
import {
  Search,
  Music,
  ListMusic,
  Plus,
  Settings,
  Command,
  ArrowRight,
  Clock,
  Home,
  Zap,
  X,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords: string[];
  category: 'navigation' | 'actions' | 'search' | 'recent';
  href?: string;
  badge?: string;
}

export default function CommandPalette({
  isOpen,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);

  // Load recent commands from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('crate-recent-commands');
    if (recent) {
      try {
        setRecentCommands(JSON.parse(recent));
      } catch (error) {
        console.error('Error loading recent commands:', error);
      }
    }
  }, []);

  // Handle animations
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Focus input after animation starts
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  const scrollToSelected = (index: number) => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll('[data-command-item]');
    const selectedItem = items[index];
    if (selectedItem) {
      selectedItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  };

  const saveRecentCommand = (commandId: string) => {
    const updated = [
      commandId,
      ...recentCommands.filter((id) => id !== commandId),
    ].slice(0, 5);
    setRecentCommands(updated);
    localStorage.setItem('crate-recent-commands', JSON.stringify(updated));
  };

  const executeCommand = (command: CommandItem) => {
    saveRecentCommand(command.id);
    command.action();
    onClose();
    setQuery('');
    setSelectedIndex(0);
  };

  const generateCommands = (): CommandItem[] => {
    if (!user?.username) return [];

    const commands: CommandItem[] = [
      // Navigation
      {
        id: 'nav-dashboard',
        title: 'Dashboard',
        description: 'Go to your personal dashboard',
        icon: Home,
        action: () => navigate({ to: `/${user.username}` }),
        keywords: ['dashboard', 'home', 'overview', 'profile'],
        category: 'navigation',
        href: `/${user.username}`,
      },
      {
        id: 'nav-tracks',
        title: 'Tracks',
        description: 'Browse your complete track collection',
        icon: Music,
        action: () => navigate({ to: `/${user.username}/tracks` }),
        keywords: ['tracks', 'music', 'collection', 'songs'],
        category: 'navigation',
        href: `/${user.username}/tracks`,
      },
      {
        id: 'nav-playlists',
        title: 'Playlists',
        description: 'Create and manage your playlists',
        icon: ListMusic,
        action: () => navigate({ to: `/${user.username}/playlists` }),
        keywords: ['playlists', 'lists', 'music', 'collections'],
        category: 'navigation',
        href: `/${user.username}/playlists`,
      },
      {
        id: 'nav-collection',
        title: 'Collection',
        description: 'Explore your synced Discogs collection',
        icon: Search,
        action: () => navigate({ to: `/${user.username}/collection` }),
        keywords: ['collection', 'discogs', 'explore', 'vinyl', 'records'],
        category: 'navigation',
        href: `/${user.username}/collection`,
      },
      {
        id: 'nav-settings',
        title: 'Settings',
        description: 'Manage your account and preferences',
        icon: Settings,
        action: () =>
          navigate({ to: `/${user.username}/settings/connections` }),
        keywords: ['settings', 'preferences', 'config', 'account'],
        category: 'navigation',
        href: `/${user.username}/settings/connections`,
      },

      // Quick Actions
      {
        id: 'action-new-playlist',
        title: 'Create Playlist',
        description: 'Start building a new playlist',
        icon: Plus,
        action: () => navigate({ to: `/${user.username}/playlists/new` }),
        keywords: ['create', 'new', 'playlist', 'make'],
        category: 'actions',
        badge: 'Quick',
      },
      {
        id: 'action-add-track',
        title: 'Add Track',
        description: 'Add new music to your collection',
        icon: Music,
        action: () => navigate({ to: `/${user.username}/tracks/add` }),
        keywords: ['add', 'track', 'music', 'upload'],
        category: 'actions',
      },
    ];

    return commands;
  };

  const commands = generateCommands();

  const filteredCommands = commands.filter((command) => {
    if (!query) return true;

    const searchTerms = query.toLowerCase().split(' ');
    return searchTerms.every(
      (term) =>
        command.title.toLowerCase().includes(term) ||
        command.description?.toLowerCase().includes(term) ||
        command.keywords.some((keyword) =>
          keyword.toLowerCase().includes(term),
        ),
    );
  });

  // Recent commands in correct recency order (only when not searching)
  const recentCommandItems = !query
    ? recentCommands
        .map((id) => commands.find((cmd) => cmd.id === id))
        .filter((cmd): cmd is CommandItem => Boolean(cmd))
    : [];

  const shouldShowRecentSection = !query && recentCommandItems.length > 0;

  const nonRecentCommands = shouldShowRecentSection
    ? filteredCommands.filter((cmd) => !recentCommands.includes(cmd.id))
    : filteredCommands;

  // This is the single source of truth for keyboard navigation + selection.
  // It matches the DOM order of `[data-command-item]` elements.
  const displayCommands = shouldShowRecentSection
    ? [...recentCommandItems, ...nonRecentCommands]
    : filteredCommands;

  // Maintain selected index when filtering
  useEffect(() => {
    if (selectedIndex >= displayCommands.length) {
      setSelectedIndex(Math.max(0, displayCommands.length - 1));
    }
  }, [displayCommands.length, selectedIndex]);

  // Group commands by category
  const groupedCommands = nonRecentCommands.reduce(
    (acc, command) => {
      if (!acc[command.category]) {
        acc[command.category] = [];
      }
      acc[command.category].push(command);
      return acc;
    },
    {} as Record<string, CommandItem[]>,
  );
  const displayIndexById = new Map(
    displayCommands.map((cmd, i) => [cmd.id, i]),
  );

  // Maintain selected index when filtering
  useEffect(() => {
    if (selectedIndex >= displayCommands.length) {
      setSelectedIndex(Math.max(0, displayCommands.length - 1));
    }
  }, [displayCommands.length, selectedIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = prev < displayCommands.length - 1 ? prev + 1 : 0;
            scrollToSelected(newIndex);
            return newIndex;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex =
              prev > 0 ? prev - 1 : Math.max(0, displayCommands.length - 1);
            scrollToSelected(newIndex);
            return newIndex;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (displayCommands[selectedIndex]) {
            executeCommand(displayCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, query, onClose, displayCommands, executeCommand]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-50 transition-opacity duration-200',
          isAnimating ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
        <div
          className={cn(
            'bg-white rounded-base shadow-light border-2 border-gray-800 w-full max-w-xl overflow-hidden transition-all duration-200 ease-out',
            isAnimating
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-2',
          )}
        >
          {/* Header */}
          <div className="flex items-center px-4 py-3 border-b-2 border-gray-800">
            <div className="flex items-center flex-1">
              <div className="flex items-center justify-center w-8 h-8 bg-main rounded-base mr-3">
                <Command className="w-4 h-4 text-black" />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 text-sm bg-transparent border-none outline-none placeholder-gray-500"
              />
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-base border-2 border-transparent hover:border-gray-800 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Results */}
          <div ref={containerRef} className="max-h-80 overflow-y-auto">
            {shouldShowRecentSection && (
              <div className="p-3">
                <div className="flex items-center px-2 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <Clock className="w-3 h-3 mr-2" />
                  Recent
                </div>
                <div className="space-y-0.5">
                  {recentCommandItems.map((command) => (
                    <CommandButton
                      key={command.id}
                      command={command}
                      isSelected={
                        displayIndexById.get(command.id) === selectedIndex
                      }
                      onClick={() => executeCommand(command)}
                    />
                  ))}
                </div>
              </div>
            )}

            {Object.entries(groupedCommands).map(
              ([category, categoryCommands]) => (
                <div key={category} className="p-3">
                  <div className="flex items-center px-2 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {category === 'navigation' && (
                      <Home className="w-3 h-3 mr-2" />
                    )}
                    {category === 'actions' && <Zap className="w-3 h-3 mr-2" />}
                    {category === 'search' && (
                      <Search className="w-3 h-3 mr-2" />
                    )}
                    {category}
                  </div>
                  <div className="space-y-0.5">
                    {categoryCommands.map((command) => {
                      return (
                        <CommandButton
                          key={command.id}
                          command={command}
                          isSelected={
                            displayIndexById.get(command.id) === selectedIndex
                          }
                          onClick={() => executeCommand(command)}
                        />
                      );
                    })}
                  </div>
                </div>
              ),
            )}

            {displayCommands.length === 0 && (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  No commands found
                </h3>
                <p className="text-xs text-gray-500">
                  Try adjusting your search or browse available commands
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-bg border-t-2 border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-white rounded-base border-2 border-gray-800 text-xs font-mono mr-1">
                    ↵
                  </kbd>
                  <span>to select</span>
                </div>
                <div className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-white rounded-base border-2 border-gray-800 text-xs font-mono mr-1">
                    ↑↓
                  </kbd>
                  <span>to navigate</span>
                </div>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <kbd className="px-1.5 py-0.5 bg-white rounded-base border-2 border-gray-800 text-xs font-mono mr-1">
                  esc
                </kbd>
                <span>to close</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface CommandButtonProps {
  command: CommandItem;
  isSelected: boolean;
  onClick: () => void;
}

function CommandButton({ command, isSelected, onClick }: CommandButtonProps) {
  const Icon = command.icon;

  return (
    <button
      data-command-item
      onClick={onClick}
      className={cn(
        'w-full flex items-center p-2 rounded-base text-left transition-all duration-150 group',
        isSelected ? 'bg-main text-black' : 'hover:bg-gray-100',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-base mr-3 transition-colors',
          isSelected ? 'bg-black/10' : 'bg-gray-100 group-hover:bg-gray-200',
        )}
      >
        <Icon
          className={cn(
            'w-4 h-4 transition-colors',
            isSelected ? 'text-black' : 'text-gray-600',
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <div
            className={cn(
              'text-sm font-medium truncate transition-colors',
              isSelected ? 'text-black' : 'text-gray-900',
            )}
          >
            {command.title}
          </div>
          {command.badge && (
            <span
              className={cn(
                'ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full',
                isSelected ? 'bg-black/10 text-black' : 'bg-main/20 text-black',
              )}
            >
              {command.badge}
            </span>
          )}
        </div>
        {command.description && (
          <div
            className={cn(
              'text-xs truncate transition-colors',
              isSelected ? 'text-black/70' : 'text-gray-500',
            )}
          >
            {command.description}
          </div>
        )}
      </div>

      {command.href && (
        <ArrowRight
          className={cn(
            'w-4 h-4 ml-2 transition-all duration-150',
            isSelected
              ? 'text-black translate-x-0'
              : 'text-gray-400 group-hover:translate-x-0.5',
          )}
        />
      )}
    </button>
  );
}
