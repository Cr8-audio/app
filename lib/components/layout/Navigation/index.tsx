'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Banner from './Banner';
import SignInButton from '@/lib/components/signIn';

export default function Navigation() {
  const user = useQuery(api.users.getCurrentUser);

  return (
    <Banner
      username={user?.username || 'Guest'}
      avatarUrl={user?.avatarUrl || '/default-avatar.png'}
      authElement={!user ? <SignInButton /> : null}
    />
  );
}
