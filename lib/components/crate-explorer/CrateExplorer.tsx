'use client';

import { useState, useEffect } from 'react';
import useDiscogsSearch from '@/lib/hooks/useDiscogsSearch';
import { useDiscogsCollection } from '@/lib/hooks/useDiscogsCollection';
import { usePlayerStore } from '@/lib/stores';
import ViewToggle from './ViewToggle';
import type { CrateExplorerProps } from '@/lib/types';
import ViewToggleButtons from './ViewToggleButtons';
import SearchView from './SearchView';
import CollectionView from './CollectionView';

const CrateExplorer = (_props: CrateExplorerProps) => {
  const {
    query,
    setQuery,
    results,
    isLoading: searchLoading,
    error: searchError,
    needsConnection: searchNeedsConnection,
  } = useDiscogsSearch();
  const {
    collection,
    total: collectionTotal,
    loading: collectionLoading,
    error: collectionError,
    needsConnection: collectionNeedsConnection,
  } = useDiscogsCollection();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [view, setView] = useState<'search' | 'collection'>('collection');

  // Initialize player when component mounts
  const { initializePlayer } = usePlayerStore();

  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  return (
    <div className="w-full py-8 sm:py-10">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ViewToggleButtons
          view={view}
          onViewChange={setView}
          collectionCount={collectionTotal}
        />
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {view === 'collection' ? (
        <CollectionView
          isLoading={collectionLoading}
          error={collectionError}
          collection={collection}
          viewMode={viewMode}
          needsConnection={collectionNeedsConnection}
        />
      ) : (
        <SearchView
          query={query}
          isLoading={searchLoading}
          error={searchError}
          results={results}
          onQueryChange={setQuery}
          viewMode={viewMode}
          needsConnection={searchNeedsConnection}
        />
      )}
    </div>
  );
};

export default CrateExplorer;
