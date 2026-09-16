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
              ? 'bg-main text-black border-2 border-black'
              : 'text-gray-500 hover:text-gray-900 border-2 border-transparent',
          )}
        >
          {item.name}
        </button>
      ))}
    </nav>
  );
}
