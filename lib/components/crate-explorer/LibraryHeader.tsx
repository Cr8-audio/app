import { Link, useParams } from '@tanstack/react-router';
import { Disc3, ListMusic, Rows3 } from 'lucide-react';
import { cn } from '@/lib/utils/tailwind';

type LibrarySection = 'tracks' | 'discogs' | 'playlists';

interface LibraryHeaderProps {
  active: LibrarySection;
  title: string;
  description: string;
}

const sections = [
  {
    id: 'tracks' as const,
    label: 'Your tracks',
    to: '/$username/tracks' as const,
    icon: Rows3,
  },
  {
    id: 'discogs' as const,
    label: 'Discogs',
    to: '/$username/collection' as const,
    icon: Disc3,
  },
  {
    id: 'playlists' as const,
    label: 'Playlists',
    to: '/$username/playlists' as const,
    icon: ListMusic,
  },
];

export function LibraryHeader({
  active,
  title,
  description,
}: LibraryHeaderProps) {
  const { username } = useParams({ strict: false });

  return (
    <div className="border-b border-border/70 pt-8 sm:pt-12">
      <div className="space-y-3 pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Library
        </p>
        <div className="max-w-3xl space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
      </div>

      <nav
        aria-label="Library sections"
        className="-mb-px flex gap-6 overflow-x-auto"
      >
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = active === section.id;

          return (
            <Link
              key={section.id}
              to={section.to}
              params={{ username: username ?? '' }}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-0.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {section.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
