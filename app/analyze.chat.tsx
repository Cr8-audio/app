import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LoadingSpinner } from '@/lib/components/ui/loading';

export const Route = createFileRoute('/analyze/chat')({
  component: ChatPage,
});

function ChatPage() {
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (user?.username) {
      navigate({ to: `/${user.username}`, replace: true });
    } else if (user === null) {
      navigate({ to: '/', replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner />
    </div>
  );
}
