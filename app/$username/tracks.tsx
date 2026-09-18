import { createFileRoute } from '@tanstack/react-router';
import ErrorBoundary from '@/lib/components/Error/ErrorBoundary';
import TracksTable from '@/lib/components/crate-explorer/tracks/TracksTable';
import { LibraryHeader } from '@/lib/components/crate-explorer/LibraryHeader';

export const Route = createFileRoute('/$username/tracks')({
  component: TracksPage,
});

function TracksPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <LibraryHeader
        active="tracks"
        title="Your tracks"
        description="Everything you have saved, ready to play, favorite, queue, or shape into a playlist."
      />
      <ErrorBoundary>
        <div className="py-8 sm:py-10">
          <TracksTable />
        </div>
      </ErrorBoundary>
    </main>
  );
}
