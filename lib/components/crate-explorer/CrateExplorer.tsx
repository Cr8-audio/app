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

interface CollectionStats {
  total: number;
  loaded: number;
}

const CrateExplorer = ({}: CrateExplorerProps) => {
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
    pagination,
    loading: collectionLoading,
    error: collectionError,
    needsConnection: collectionNeedsConnection,
  } = useDiscogsCollection();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [view, setView] = useState<'search' | 'collection'>('search');

  // Initialize player when component mounts
  const { initializePlayer } = usePlayerStore();

  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);
  const [collectionStats, setCollectionStats] = useState<CollectionStats>({
    total: 0,
    loaded: 0,
  });

  useEffect(() => {
    if (pagination) {
      setCollectionStats({
        total: pagination.items,
        loaded: collection.length,
      });
    }
  }, [collection, pagination]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <ViewToggleButtons
          view={view}
          onViewChange={setView}
          collectionCount={collectionStats.total}
        />
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {view === 'search' ? (
        <SearchView
          query={query}
          isLoading={searchLoading}
          error={searchError}
          results={results}
          onQueryChange={setQuery}
          viewMode={viewMode}
          needsConnection={searchNeedsConnection}
        />
      ) : (
        <CollectionView
          isLoading={collectionLoading}
          error={collectionError}
          collection={collection}
          viewMode={viewMode}
          needsConnection={collectionNeedsConnection}
        />
      )}
    </div>
  );
};

export default CrateExplorer;
