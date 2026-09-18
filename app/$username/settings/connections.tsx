import { createFileRoute } from '@tanstack/react-router';
import { DiscogsConnectionCard } from '@/lib/components/onboarding/DiscogsConnectionCard';

export const Route = createFileRoute('/$username/settings/connections')({
  component: ConnectionsPage,
});

function ConnectionsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
      <header className="border-b border-border/70 pb-7 pt-8 sm:pt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Settings
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Connections
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Link the places where your music already lives. Credentials stay on
          the server and never reach your browser.
        </p>
      </header>
      <section className="py-8 sm:py-10">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">
            Music services
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Crate keeps connected libraries synced in the background.
          </p>
        </div>
        <DiscogsConnectionCard />
      </section>
    </main>
  );
}
