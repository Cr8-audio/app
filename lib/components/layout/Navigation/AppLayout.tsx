'use client';

import { Link, Navigate, useLocation } from '@tanstack/react-router';
import { Disc3, LibraryBig, ListMusic, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils/tailwind';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import PersistentPlayer from '@/lib/components/ui/persistent-player';
import { LoadingSpinner } from '@/lib/components/ui/loading';

interface AppLayoutProps {
  children: React.ReactNode;
}

function MobileNavigation({ username }: { username: string }) {
  const { pathname } = useLocation();
  const items = [
    {
      label: 'Ask',
      href: '/analyze/chat',
      icon: MessageCircle,
      active: pathname.startsWith('/analyze'),
    },
    {
      label: 'Library',
      href: `/${username}/tracks`,
      icon: LibraryBig,
      active:
        pathname.startsWith(`/${username}/tracks`) ||
        pathname.startsWith(`/${username}/collection`),
    },
    {
      label: 'Playlists',
      href: `/${username}/playlists`,
      icon: ListMusic,
      active: pathname.startsWith(`/${username}/playlists`),
    },
  ];

  return (
    <nav
      aria-label="Primary navigation"
      className="grid h-[4.35rem] flex-shrink-0 grid-cols-3 border-t border-border/80 bg-card/95 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            to={item.href}
            aria-current={item.active ? 'page' : undefined}
            className={cn(
              'relative flex min-w-0 flex-col items-center justify-center gap-1 text-[0.68rem] font-medium transition-colors',
              item.active
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.active && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
            )}
            <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.8} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function BareLoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background">
          <Disc3 className="h-5 w-5" />
        </span>
        <LoadingSpinner />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { pathname } = useLocation();
  const { isAuthenticated, isLoading, username } = useAuth();
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  const isAlwaysBareRoute =
    normalizedPath === '/' ||
    normalizedPath === '/auth' ||
    normalizedPath === '/connect/discogs/callback';
  const isOnboardingRoute = normalizedPath === '/onboarding';

  if (isAlwaysBareRoute) return <>{children}</>;
  if (isLoading) return <BareLoadingState />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!username) {
    return isOnboardingRoute ? (
      <>{children}</>
    ) : (
      <Navigate to="/onboarding" replace />
    );
  }

  if (isOnboardingRoute) return <Navigate to="/analyze/chat" replace />;

  const [routeUsername, section, subSection] = normalizedPath
    .split('/')
    .filter(Boolean);
  const isUsernameRoute =
    routeUsername !== undefined &&
    routeUsername !== 'analyze' &&
    routeUsername !== 'connect';

  if (isUsernameRoute && routeUsername !== username) {
    const params = { username };

    if (section === 'tracks') {
      return <Navigate to="/$username/tracks" params={params} replace />;
    }
    if (section === 'collection') {
      return <Navigate to="/$username/collection" params={params} replace />;
    }
    if (section === 'playlists') {
      return <Navigate to="/$username/playlists" params={params} replace />;
    }
    if (section === 'settings' || subSection === 'connections') {
      return (
        <Navigate
          to="/$username/settings/connections"
          params={params}
          replace
        />
      );
    }

    return <Navigate to="/$username" params={params} replace />;
  }

  return (
    <div className="flex h-screen h-dvh min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="h-full min-h-full">{children}</div>
          </main>
          <MobileNavigation username={username} />
        </div>
      </div>

      <div className="relative z-[60] flex-shrink-0">
        <PersistentPlayer />
      </div>
    </div>
  );
}
