import { useState, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import useDebounce from './useDebounce';
import type { DiscogsSearchResult } from '@/lib/types';

interface UseDiscogsSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: DiscogsSearchResult[];
  isLoading: boolean;
  error: string | null;
  isQueryValid: boolean;
  needsConnection: boolean;
}

const MIN_SEARCH_LENGTH = 3;

const useDiscogsSearch = (): UseDiscogsSearchReturn => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiscogsSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConnection, setNeedsConnection] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const isQueryValid = debouncedQuery.length >= MIN_SEARCH_LENGTH;

  const search = useAction(api.discogs.search);

  useEffect(() => {
    let cancelled = false;
    const searchDiscogs = async () => {
      if (!isQueryValid) {
        setResults([]);
        setError(null);
        setNeedsConnection(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setNeedsConnection(false);

      try {
        const data = await search({ query: debouncedQuery });
        if (!cancelled) {
          setResults(data.results as unknown as DiscogsSearchResult[]);
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : 'An error occurred during search',
        );
        setResults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    searchDiscogs();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isQueryValid, search]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    isQueryValid,
    needsConnection,
  };
};

export default useDiscogsSearch;
