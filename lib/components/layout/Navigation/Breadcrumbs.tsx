import { useLocation, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { cn } from '@/lib/utils/tailwind';
import {
  ChevronRight,
  Home,
  Music,
  ListMusic,
  Search,
  Brain,
} from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  current?: boolean;
}

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const user = useQuery(api.users.getCurrentUser);

  if (!user) return null;

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Home/Dashboard
    breadcrumbs.push({
      label: 'Dashboard',
      href: `/${user.username}`,
      icon: Home,
    });

    // Handle different path patterns
    if (pathSegments.length > 1) {
      const section = pathSegments[1];

      switch (section) {
        case 'tracks':
          breadcrumbs.push({
            label: 'Tracks',
            href: `/${user.username}/tracks`,
            icon: Music,
          });
          break;

        case 'playlists':
          breadcrumbs.push({
            label: 'Playlists',
            href: `/${user.username}/playlists`,
            icon: ListMusic,
          });

          // Handle specific playlist
          if (pathSegments.length > 2) {
            const playlistId = pathSegments[2];
            breadcrumbs.push({
              label: `Playlist ${playlistId}`,
              href: `/${user.username}/playlists/${playlistId}`,
            });
          }
          break;

        case 'collection':
          breadcrumbs.push({
            label: 'Collection',
            href: `/${user.username}/collection`,
            icon: Search,
          });
          break;
      }
    }

    // Handle analyze section (not user-specific)
    if (pathSegments[0] === 'analyze') {
      breadcrumbs.length = 0; // Clear previous breadcrumbs
      breadcrumbs.push({
        label: 'Analyze',
        href: '/analyze',
        icon: Brain,
      });

      if (pathSegments.length > 1) {
        const subSection = pathSegments[1];
        switch (subSection) {
          case 'chat':
            breadcrumbs.push({
              label: 'Chat',
              href: '/analyze/chat',
            });
            break;
        }
      }
    }

    // Mark the last item as current
    if (breadcrumbs.length > 0) {
      breadcrumbs[breadcrumbs.length - 1].current = true;
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs if we're on the dashboard
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6 px-2">
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const Icon = item.icon;

          return (
            <li key={item.href || item.label} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
              )}

              {isLast ? (
                <span
                  className={cn(
                    'flex items-center font-medium',
                    item.current ? 'text-gray-900' : 'text-gray-600',
                  )}
                >
                  {Icon && <Icon className="w-4 h-4 mr-2" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href!}
                  className="flex items-center hover:text-gray-900 transition-colors"
                >
                  {Icon && <Icon className="w-4 h-4 mr-2" />}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Additional component for page titles with breadcrumbs
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <Breadcrumbs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        {children && (
          <div className="flex items-center space-x-3">{children}</div>
        )}
      </div>
    </div>
  );
}
