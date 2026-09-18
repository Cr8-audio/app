'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils/tailwind';
import { useAuthActions } from '@convex-dev/auth/react';
import {
  Search,
  Settings,
  LogOut,
  User,
  Command,
  Menu,
  X,
  ListMusic,
  Brain,
  Home,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/lib/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/lib/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/lib/components/ui/avatar';
import CommandPalette from './CommandPalette';

interface TopBarProps {
  sidebarCollapsed?: boolean;
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
  onSearchQueryChange?: (query: string) => void;
  searchQuery?: string;
  searchPlaceholder?: string;
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

export default function TopBar({
  sidebarCollapsed = false,
  onMobileMenuToggle,
  mobileMenuOpen = false,
  onSearchQueryChange,
  searchQuery: externalSearchQuery,
  searchPlaceholder = 'Search tracks, playlists, artists...',
}: TopBarProps) {
  const { user, username } = useAuth();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use external search query if provided, otherwise use internal state
  const searchQuery =
    externalSearchQuery !== undefined
      ? externalSearchQuery
      : internalSearchQuery;

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

  // Handle command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setSearchDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate({ to: '/' });
    } catch (error) {
      console.error('Failed to logout:', error);
      navigate({ to: '/' });
    }
  };

  const generateCommands = (): CommandItem[] => {
    if (!username) return [];

    const commands: CommandItem[] = [
      // Navigation
      {
        id: 'nav-dashboard',
        title: 'Dashboard',
        description: 'Go to your personal dashboard',
        icon: Home,
        action: () => navigate({ to: `/${username}` }),
        keywords: ['dashboard', 'home', 'overview', 'profile'],
        category: 'navigation',
        href: `/${username}`,
      },
      {
        id: 'nav-tracks',
        title: 'Tracks',
        description: 'Browse your complete track collection',
        icon: ListMusic,
        action: () => navigate({ to: `/${username}/tracks` }),
        keywords: ['tracks', 'music', 'collection', 'songs'],
        category: 'navigation',
        href: `/${username}/tracks`,
      },
      {
        id: 'nav-playlists',
        title: 'Playlists',
        description: 'Create and manage your playlists',
        icon: ListMusic,
        action: () => navigate({ to: `/${username}/playlists` }),
        keywords: ['playlists', 'lists', 'music', 'collections'],
        category: 'navigation',
        href: `/${username}/playlists`,
      },
      {
        id: 'nav-collection',
        title: 'Collection',
        description: 'Explore your synced Discogs collection',
        icon: Search,
        action: () => navigate({ to: `/${username}/collection` }),
        keywords: ['collection', 'discogs', 'explore', 'vinyl', 'records'],
        category: 'navigation',
        href: `/${username}/collection`,
      },
      {
        id: 'nav-analyze',
        title: 'Chat',
        description: 'Ask the DJ assistant about your collection',
        icon: Brain,
        action: () => navigate({ to: '/analyze/chat' }),
        keywords: ['chat', 'assistant', 'ai', 'dj', 'ask'],
        category: 'navigation',
        href: '/analyze/chat',
      },
      {
        id: 'nav-settings',
        title: 'Settings',
        description: 'Manage your account and preferences',
        icon: Settings,
        action: () => navigate({ to: `/${username}/settings/connections` }),
        keywords: ['settings', 'preferences', 'config', 'account'],
        category: 'navigation',
        href: `/${username}/settings/connections`,
      },
    ];

    return commands;
  };

  const commands = generateCommands();

  const filteredCommands = commands.filter((command) => {
    if (!searchQuery) return true;

    const searchTerms = searchQuery.toLowerCase().split('');
    return searchTerms.every(
      (term) =>
        command.title.toLowerCase().includes(term) ||
        command.description?.toLowerCase().includes(term) ||
        command.keywords.some((keyword) =>
          keyword.toLowerCase().includes(term),
        ),
    );
  });

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
    setSearchDropdownOpen(false);
    setInternalSearchQuery('');
    if (onSearchQueryChange) {
      onSearchQueryChange('');
    }
    setSelectedIndex(0);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // If external handler provided, use it (controlled mode)
    if (onSearchQueryChange) {
      onSearchQueryChange(value);
    } else {
      // Otherwise, use internal state (uncontrolled mode)
      setInternalSearchQuery(value);
    }

    // Show dropdown when typing, ONLY if not in filtering mode
    if (value.length > 0 && !onSearchQueryChange) {
      setSearchDropdownOpen(true);
      setSelectedIndex(0);
    } else {
      setSearchDropdownOpen(false);
    }
  };

  const handleSearchFocus = () => {
    if (searchQuery.length > 0 && !onSearchQueryChange) {
      setSearchDropdownOpen(true);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!searchDropdownOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1,
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setSearchDropdownOpen(false);
        searchInputRef.current?.blur();
        break;
    }
  };

  // Show recent commands if no query
  const recentCommandItems = !searchQuery
    ? commands.filter((cmd) => recentCommands.includes(cmd.id))
    : [];

  const displayCommands = searchQuery ? filteredCommands : recentCommandItems;

  return (
    <>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
      <header
        className={cn(
          'h-16 bg-card border-b border-border transition-all duration-300 z-40 flex items-center justify-between px-6 w-full sticky top-0',
        )}
      >
        {/* Mobile Menu Button */}
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5 active:text-primary transition-colors" />
          ) : (
            <Menu className="w-5 h-5 active:text-primary transition-colors" />
          )}
        </button>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl mx-4 relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-16 py-2 border border-border rounded-base focus:outline-none focus:ring-0 text-sm transition-all placeholder:text-muted-foreground"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <kbd
                className="px-2 py-1 text-xs bg-card border border-border rounded-base text-foreground font-bold cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setCommandPaletteOpen(true)}
              >
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Search Dropdown */}
          {searchDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-base border border-border max-h-80 overflow-y-auto z-50">
              {!searchQuery && recentCommandItems.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Clock className="w-3 h-3 mr-2" />
                    Recent
                  </div>
                </div>
              )}

              {displayCommands.length > 0 ? (
                <div className="p-2 space-y-1">
                  {displayCommands.map((command, index) => (
                    <SearchCommandButton
                      key={command.id}
                      command={command}
                      isSelected={index === selectedIndex}
                      onClick={() => executeCommand(command)}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <Search className="w-6 h-6 mx-auto mb-2 text-muted-foreground/70" />
                  <p className="text-sm">No commands found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* User Menu */}
          {username ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 hover:bg-accent p-2"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.avatarUrl || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground border border-border">
                      {username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block font-medium">
                    {username}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => navigate({ to: `/${username}` })}
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    navigate({ to: `/${username}/settings/connections` })
                  }
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => navigate({ to: '/auth' })}
              className="text-sm"
            >
              Sign In
            </Button>
          )}
        </div>
      </header>
    </>
  );
}

interface SearchCommandButtonProps {
  command: CommandItem;
  isSelected: boolean;
  onClick: () => void;
}

function SearchCommandButton({
  command,
  isSelected,
  onClick,
}: SearchCommandButtonProps) {
  const Icon = command.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center p-2 rounded-base text-left transition-all duration-150 group',
        isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-base mr-3 transition-colors',
          isSelected ? 'bg-black/10' : 'bg-muted group-hover:bg-accent',
        )}
      >
        <Icon
          className={cn(
            'w-4 h-4 transition-colors',
            isSelected ? 'text-foreground' : 'text-muted-foreground',
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <div
            className={cn(
              'text-sm font-medium truncate transition-colors',
              isSelected ? 'text-foreground' : 'text-foreground',
            )}
          >
            {command.title}
          </div>
          {command.badge && (
            <span
              className={cn(
                'ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full',
                isSelected
                  ? 'bg-black/10 text-foreground'
                  : 'bg-primary/20 text-foreground',
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
              isSelected
                ? 'text-primary-foreground/70'
                : 'text-muted-foreground',
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
              ? 'text-foreground translate-x-0'
              : 'text-muted-foreground/70 group-hover:translate-x-0.5',
          )}
        />
      )}
    </button>
  );
}
