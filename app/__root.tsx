import { QueryClient } from '@tanstack/react-query';
import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import appCss from './globals.css?url';
import AppLayout from '@/lib/components/layout/Navigation/AppLayout';
import ErrorBoundary from '@/lib/components/Error/ErrorBoundary';
import { LoadingSpinner } from '@/lib/components/ui/loading';
import GlobalError from '@/lib/components/Error/GlobalError';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error('VITE_CONVEX_URL environment variable is not set');
}

const convex = new ConvexReactClient(convexUrl);

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Crate',
      },
      {
        name: 'description',
        content: 'Your AI-powered music collection analyzer',
      },
      {
        name: 'keywords',
        content: 'Crate, Discogs, Music, AI, Analyzer, Bpm',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body
        // TODO: Add font class back after migration to fontsource
        style={{
          backgroundImage: 'radial-gradient(#FFDC58 1px, transparent 1px)',
          backgroundSize: '10px 10px',
        }}
      >
        <ErrorBoundary fallback={<GlobalError />}>
          <ConvexAuthProvider client={convex}>
            <AppLayout>
              <ErrorBoundary>
                <Suspense fallback={<LoadingSpinner />}>
                  <Outlet />
                </Suspense>
              </ErrorBoundary>
            </AppLayout>
          </ConvexAuthProvider>
        </ErrorBoundary>
        <Toaster
          position="top-center"
          expand={false}
          closeButton
          richColors
          toastOptions={{
            style: {
              border: '2px solid #1f2937', // gray-800
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: 'white',
              color: '#1a1a1a',
            },
            className: 'shadow-light',
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}
