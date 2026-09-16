import { createFileRoute } from '@tanstack/react-router';
import ErrorBoundary from '@/lib/components/Error/ErrorBoundary';
import TracksTable from '@/lib/components/crate-explorer/tracks/TracksTable';
import EnhancedAiLayout from '@/lib/components/ai-assistant/EnhancedAiLayout';
import { PageHeader } from '@/lib/components/layout/Navigation/Breadcrumbs';

export const Route = createFileRoute('/$username/tracks')({
  component: TracksPage,
});

function TracksPage() {
  return (
    <ErrorBoundary>
      <PageHeader
        title="Track Collection"
        description="Browse and manage your music tracks"
      />
      <EnhancedAiLayout>
        <div className="mx-auto py-8 px-4 lg:px-8 overflow-visible">
          <TracksTable />
        </div>
      </EnhancedAiLayout>
    </ErrorBoundary>
  );
}
