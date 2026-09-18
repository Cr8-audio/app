import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
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

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error('VITE_CONVEX_URL environment variable is not set');
}

const convex = new ConvexReactClient(convexUrl);

export const Route = createRootRoute({
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

function RootBody({ children }: { children: React.ReactNode }) {
  return <body>{children}</body>;
}

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <RootBody>
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
          position="bottom-center"
          theme="dark"
          toastOptions={{
            className:
              '!bg-popover !text-popover-foreground !border !border-border !rounded-card',
          }}
        />
        <Scripts />
      </RootBody>
    </html>
  );
}
