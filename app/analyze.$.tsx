import { createFileRoute, Navigate } from '@tanstack/react-router';

// The in-app assistant used to live under /analyze. Old links go home, which
// sends signed-in users on to their library.
export const Route = createFileRoute('/analyze/$')({
  component: () => <Navigate to="/" replace />,
});
