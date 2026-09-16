import { useState, useEffect } from 'react';
import type { CollectionRelease } from '@/lib/types';

interface CollectionData {
  collection: CollectionRelease[];
  pagination?: {
    items: number;
    page: number;
    pages: number;
  };
}

export function useDiscogsCollection() {
  const [collectionData, setCollectionData] = useState<CollectionData>({
    collection: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConnection, setNeedsConnection] = useState(false);

  const fetchCollection = async () => {
    try {
      setLoading(true);
      setError(null);
      setNeedsConnection(false);
      const response = await fetch('/api/external/discogs/collection');

      if (response.status === 401) {
        setNeedsConnection(true);
        setError('Please connect your Discogs account to view your collection');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch collection');

      const data = await response.json();
      setCollectionData({
        collection: data.releases,
        pagination: data.pagination,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollection();
  }, []);

  return {
    collection: collectionData.collection,
    pagination: collectionData.pagination,
    loading,
    error,
    needsConnection,
    refetch: fetchCollection,
  };
}
