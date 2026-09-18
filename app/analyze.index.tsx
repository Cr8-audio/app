import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LoadingSpinner } from '@/lib/components/ui/loading';

export const Route = createFileRoute('/analyze/')({
  component: AnalyzePage,
});

function AnalyzePage() {
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (user?.username) {
      // Ask is the primary signed-in destination.
      navigate({ to: '/analyze/chat', replace: true });
    } else if (user === null) {
      navigate({ to: '/', replace: true });
    } else if (user && !user.username) {
      navigate({ to: '/onboarding', replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex min-h-full items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
