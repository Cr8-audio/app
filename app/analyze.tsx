import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LoadingSpinner } from '@/lib/components/ui/loading';

export const Route = createFileRoute('/analyze')({
  component: AnalyzePage,
});

function AnalyzePage() {
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (user?.username && user.onboardingComplete) {
      // Chat is home — do not bounce to /$username dashboard
      navigate({ to: '/analyze/chat', replace: true });
    } else if (user === null) {
      navigate({ to: '/', replace: true });
    } else if (user && (!user.username || !user.onboardingComplete)) {
      navigate({ to: '/onboarding', replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner />
    </div>
  );
}
