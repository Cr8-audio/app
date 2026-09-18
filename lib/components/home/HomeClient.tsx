import { useNavigate } from '@tanstack/react-router';
import { Unauthenticated, AuthLoading, Authenticated } from 'convex/react';
import { LoadingSpinner } from '@/lib/components/ui/loading';
import SignInButton from '@/lib/components/signIn';
import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface HomeClientProps {}

const HomeClient = ({}: HomeClientProps) => {
  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </AuthLoading>

      <Authenticated>
        <AuthenticatedRedirect />
      </Authenticated>

      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
    </>
  );
};

// Separate component to handle authenticated redirect
function AuthenticatedRedirect() {
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (user) {
      // Check if user has completed onboarding
      if (!user.username) {
        // New user - needs to create username
        navigate({ to: '/onboarding', replace: true });
        return;
      }

      // Chat is the primary signed-in surface (not /$username dashboard)
      navigate({ to: '/analyze/chat', replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner />
    </div>
  );
}

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-2 px-6 py-5">
        <img src="/logo.svg" alt="" width={24} height={24} className="invert" />
        <span className="text-sm font-semibold tracking-tight">Crate</span>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Your record collection, ready to dig.
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Crate syncs your Discogs collection so you can browse it, build
            playlists from what you own, and ask a DJ assistant what to play
            next.
          </p>
          <div className="mx-auto mt-8 max-w-xs">
            <SignInButton />
          </div>
        </div>
      </main>
    </div>
  );
}

export default HomeClient;
