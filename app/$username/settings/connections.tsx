import { createFileRoute } from '@tanstack/react-router';
import { DiscogsConnectionCard } from '@/lib/components/onboarding/DiscogsConnectionCard';

export const Route = createFileRoute('/$username/settings/connections')({
  component: ConnectionsPage,
});

function ConnectionsPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Connections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crate syncs your collection from Discogs in the background. Access
          tokens stay on the server and never reach your browser.
        </p>
      </header>
      <DiscogsConnectionCard />
    </div>
  );
}
