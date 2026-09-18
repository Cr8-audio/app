'use client';

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useAuthActions } from '@convex-dev/auth/react';
import {
  Command,
  Disc3,
  LogOut,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
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

function getPageMeta(pathname: string, username: string | null) {
  if (pathname.startsWith('/analyze')) {
    return { eyebrow: 'Your collection', title: 'Ask Crate' };
  }
  if (
    username &&
    (pathname.startsWith(`/${username}/tracks`) ||
      pathname.startsWith(`/${username}/collection`))
  ) {
    return { eyebrow: 'Your collection', title: 'Library' };
  }
  if (username && pathname.startsWith(`/${username}/playlists`)) {
    return { eyebrow: 'Your collection', title: 'Playlists' };
  }
  if (pathname.includes('/settings')) {
    return { eyebrow: 'Account', title: 'Connections' };
  }
  return { eyebrow: 'Your collection', title: 'Overview' };
}

export default function TopBar() {
  const { pathname } = useLocation();
  const { user, username } = useAuth();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const page = getPageMeta(pathname, username);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate({ to: '/' });
    }
  };

  return (
    <>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      <header className="flex h-[4.5rem] flex-shrink-0 items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background md:hidden">
            <Disc3 className="h-[1.1rem] w-[1.1rem]" />
          </span>
          <div className="min-w-0">
            <p className="hidden text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground sm:block">
              {page.eyebrow}
            </p>
            <p className="truncate text-base font-semibold tracking-[-0.02em] text-foreground sm:text-[1.05rem]">
              {page.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="group hidden h-9 items-center gap-2.5 rounded-xl border border-border/80 bg-card px-3 text-xs text-muted-foreground shadow-sm transition-colors hover:border-foreground/15 hover:text-foreground sm:flex"
            aria-label="Open command menu"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Jump to…</span>
            <kbd className="ml-4 flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.62rem] text-muted-foreground">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Open command menu"
          >
            <Search className="h-4 w-4" />
          </Button>

          {username && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 gap-2 rounded-xl px-1.5 text-foreground hover:bg-muted sm:pr-2.5"
                  aria-label="Open account menu"
                >
                  <Avatar className="h-8 w-8 border border-border/80">
                    <AvatarImage src={user?.avatarUrl || ''} />
                    <AvatarFallback className="bg-foreground text-xs font-semibold text-background">
                      {username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-28 truncate text-xs font-semibold sm:block">
                    {user?.displayName || username}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl border-border/80 p-1.5 shadow-float"
              >
                <DropdownMenuItem
                  onClick={() => navigate({ to: `/${username}` })}
                  className="rounded-lg"
                >
                  <UserRound className="mr-2 h-4 w-4" />
                  Overview
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    navigate({ to: `/${username}/settings/connections` })
                  }
                  className="rounded-lg"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Connections
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="rounded-lg text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
    </>
  );
}
