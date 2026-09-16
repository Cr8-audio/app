import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import HomeClient from '@/lib/components/home/HomeClient';
import { LoadingSpinner } from '@/lib/components/ui/loading';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen">
      <Suspense fallback={<LoadingSpinner />}>
        <HomeClient />
      </Suspense>
    </main>
  );
}
