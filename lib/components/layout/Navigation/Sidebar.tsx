import { Link, useLocation } from '@tanstack/react-router';
import {
  Disc3,
  LibraryBig,
  ListMusic,
  MessageCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils/tailwind';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/lib/components/ui/avatar';

export default function Sidebar() {
  const { pathname } = useLocation();
  const { username, user } = useAuth();

  if (!username) return null;

  const navigationItems = [
    {
      name: 'Ask',
      description: 'Dig with your assistant',
      href: '/analyze/chat',
      icon: MessageCircle,
      active: pathname.startsWith('/analyze'),
    },
    {
      name: 'Library',
      description: 'Tracks and releases',
      href: `/${username}/tracks`,
      icon: LibraryBig,
      active:
        pathname.startsWith(`/${username}/tracks`) ||
        pathname.startsWith(`/${username}/collection`),
    },
    {
      name: 'Playlists',
      description: 'Sets in progress',
      href: `/${username}/playlists`,
      icon: ListMusic,
      active: pathname.startsWith(`/${username}/playlists`),
    },
  ];

  return (
    <aside className="hidden h-full w-[15.5rem] flex-shrink-0 flex-col border-r border-border/70 bg-card/75 px-4 py-5 backdrop-blur-xl md:flex">
      <Link
        to="/$username"
        params={{ username }}
        className="mb-9 flex items-center gap-3 rounded-xl px-2 py-1.5"
        aria-label="Crate overview"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
          <Disc3 className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.8} />
        </span>
        <span className="text-[1.05rem] font-semibold tracking-[-0.025em]">
          crate
        </span>
      </Link>

      <nav aria-label="Primary navigation" className="space-y-1.5">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-150',
                item.active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-[0.65rem] transition-colors',
                  item.active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-muted-foreground group-hover:bg-card group-hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">
                  {item.name}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block truncate text-[0.68rem]',
                    item.active
                      ? 'text-accent-foreground/65'
                      : 'text-muted-foreground/75',
                  )}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <Link
          to="/$username/settings/connections"
          params={{ username }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-[0.65rem] bg-muted">
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <span>
            <span className="block text-xs font-semibold text-foreground">
              Discogs collection
            </span>
            <span className="block text-[0.68rem]">Manage connection</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 border-t border-border/70 px-2 pt-4">
          <Avatar className="h-9 w-9 border border-border/70">
            <AvatarImage src={user?.avatarUrl ?? ''} />
            <AvatarFallback className="bg-foreground text-xs font-semibold text-background">
              {username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.displayName || username}
            </p>
            <p className="truncate text-[0.68rem] text-muted-foreground">
              @{username}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
