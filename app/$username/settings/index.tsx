import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/useAuth';

export const Route = createFileRoute('/$username/settings/')({
  component: SettingsPage,
});

function SettingsPage() {
  const { username } = useAuth();
  const { username: routeUsername } = Route.useParams();

  // Redirect to connections page by default
  if (username) {
    return (
      <Navigate
        to="/$username/settings/connections"
        params={{ username: routeUsername }}
        replace
      />
    );
  }

  return null;
}
