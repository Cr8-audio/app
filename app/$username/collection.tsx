import { createFileRoute } from '@tanstack/react-router';
import CrateExplorer from '@/lib/components/crate-explorer/CrateExplorer';
import ErrorBoundary from '@/lib/components/Error/ErrorBoundary';
import { LibraryHeader } from '@/lib/components/crate-explorer/LibraryHeader';

export const Route = createFileRoute('/$username/collection')({
  component: CollectionPage,
});

function CollectionPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <LibraryHeader
        active="discogs"
        title="Your shelves, in Crate"
        description="Start with the records you own, then search the wider Discogs catalog when inspiration strikes."
      />
      <ErrorBoundary>
        <CrateExplorer />
      </ErrorBoundary>
    </main>
  );
}
