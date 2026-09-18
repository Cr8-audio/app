import { useLocation, Link } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils/tailwind';
import { Home, Music, ListMusic, Search, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/lib/components/ui/avatar';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const { pathname } = useLocation();
  const { username, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  // Sync internal state with prop
  useEffect(() => {
    setIsCollapsed(collapsed);
  }, [collapsed]);

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onToggle?.();
  };

  if (!username) return null;

  const navigationItems = [
    {
      name: 'Chat',
      href: '/analyze/chat',
      icon: MessageCircle,
      description: 'DJ Assistant',
    },
    {
      name: 'Tracks',
      href: `/${username}/tracks`,
      icon: Music,
      description: 'Library',
    },
    {
      name: 'Playlists',
      href: `/${username}/playlists`,
      icon: ListMusic,
      description: 'Collections',
    },
    {
      name: 'Collection',
      href: `/${username}/collection`,
      icon: Search,
      description: 'Discogs',
    },
    {
      name: 'Overview',
      href: `/${username}`,
      icon: Home,
      description: 'Dashboard',
    },
  ];

  return (
    <aside
      className={cn(
        'h-full bg-card border-r border-border transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-20' : 'w-72',
      )}
    >
      {/* Sidebar Header */}
      <div
        className={cn(
          'flex items-center px-6 border-b border-border h-16 transition-all',
          isCollapsed ? 'justify-center' : 'justify-start',
        )}
      >
        <div
          onClick={handleToggle}
          className={cn(
            'flex items-center transition-all cursor-pointer hover:scale-105 active:scale-95',
            !isCollapsed && 'space-x-3',
          )}
        >
          <div className="relative w-8 h-8 shrink-0">
            <img
              src="/logo.svg"
              alt="Crate Logo"
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-xl tracking-tight">Crate</span>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== `/${username}` &&
              item.href !== '/analyze/chat' &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center space-x-3 px-4 py-3 rounded-base transition-all duration-200 relative border',
                isActive
                  ? 'bg-primary border-border text-primary-foreground'
                  : 'bg-transparent border-transparent hover:bg-accent hover:border-border text-muted-foreground hover:text-foreground',
                isCollapsed && 'justify-center px-2',
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-colors',
                  isActive ? 'text-foreground' : 'text-current',
                )}
              />

              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      'font-medium truncate',
                      isActive ? 'text-foreground' : 'text-current',
                    )}
                  >
                    {item.name}
                  </div>
                </div>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-black text-white text-sm font-medium rounded-base opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-white">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-6 border-t border-border bg-card">
        <div
          className={cn(
            'flex items-center space-x-3 p-2 rounded-base border transition-all cursor-pointer group',
            isCollapsed
              ? 'justify-center bg-transparent border-transparent hover:bg-card hover:border-border '
              : 'bg-card border-border hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-accent',
          )}
        >
          <Avatar className="w-9 h-9 border border-border shrink-0">
            <AvatarImage src={user?.avatarUrl ?? ''} />
            <AvatarFallback className="bg-primary font-bold text-sm text-primary-foreground">
              {username?.charAt(0).toUpperCase() ?? ''}
            </AvatarFallback>
          </Avatar>

          {!isCollapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="font-medium text-sm truncate text-foreground">
                {username}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                View Profile
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
