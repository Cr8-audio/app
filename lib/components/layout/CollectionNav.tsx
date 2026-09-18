'use client';

import { useLocation, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils/tailwind';

export function CollectionNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const username = pathname.split('/')[1];

  const items = [
    { name: 'Tracks', href: `/${username}/tracks` },
    { name: 'Playlists', href: `/${username}/playlists` },
  ];

  return (
    <nav className="flex space-x-2 mb-8">
      {items.map((item) => (
        <button
          key={item.name}
          onClick={() => navigate({ to: item.href })}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-full transition-colors',
            pathname === item.href
              ? 'bg-primary text-primary-foreground border border-border'
              : 'text-muted-foreground hover:text-foreground border border-transparent',
          )}
        >
          {item.name}
        </button>
      ))}
    </nav>
  );
}
