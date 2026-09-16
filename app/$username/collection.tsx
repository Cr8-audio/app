import { createFileRoute } from '@tanstack/react-router';
import CrateExplorer from '@/lib/components/crate-explorer/CrateExplorer';
import ErrorBoundary from '@/lib/components/Error/ErrorBoundary';
import { PageHeader } from '@/lib/components/layout/Navigation/Breadcrumbs';

export const Route = createFileRoute('/$username/collection')({
  component: CollectionPage,
});

function CollectionPage() {
  return (
    <>
      <PageHeader
        title="Collection Explorer"
        description="Browse your Discogs collection and discover new music"
      />
      <ErrorBoundary>
        <CrateExplorer />
      </ErrorBoundary>
    </>
  );
}
