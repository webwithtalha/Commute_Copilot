'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import type { Stop, ApiResponse } from '@/types/tfl';

/**
 * Response shape from /api/tfl/stops/search
 */
interface SearchResponse {
  total: number;
  query: string;
  stops: Stop[];
}

/**
 * Search parameters
 */
interface UseSearchParams {
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number;
  /** Filter by transport modes (default: 'bus') */
  modes?: string;
  /** Maximum results to return (default: 20) */
  maxResults?: number;
  /** Whether to enable the search query */
  enabled?: boolean;
}

/**
 * Hook for searching stops with debounce and caching
 * 
 * @param query - Search query string (minimum 2 characters)
 * @param params - Optional search parameters
 * @returns Query result with stops data
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, debouncedQuery } = useSearch(searchInput, {
 *   debounceMs: 300,
 *   modes: 'bus',
 * });
 * ```
 */
export function useSearch(query: string, params: UseSearchParams = {}) {
  const {
    debounceMs = 300,
    modes = 'bus',
    maxResults = 20,
    enabled = true,
  } = params;

  // Debounced query state
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Determine if search should be enabled
  const trimmedQuery = debouncedQuery.trim();
  const shouldSearch = enabled && trimmedQuery.length >= 2;

  const queryResult = useQuery<SearchResponse>({
    queryKey: ['stops', 'search', trimmedQuery, modes, maxResults],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        q: trimmedQuery,
        modes,
        maxResults: maxResults.toString(),
      });

      const response = await fetch(`/api/tfl/stops/search?${searchParams}`);
      const data: ApiResponse<SearchResponse> = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          'error' in data ? data.error : 'Failed to search stops'
        );
      }

      return data.data;
    },
    enabled: shouldSearch,
    // Cache search results for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Placeholder data while loading
    placeholderData: (previousData) => previousData,
  });

  // Clear function to reset the search
  const clear = useCallback(() => {
    setDebouncedQuery('');
  }, []);

  return {
    ...queryResult,
    /** The debounced query value being used for the current search */
    debouncedQuery: trimmedQuery,
    /** Whether the query is currently being debounced */
    isDebouncing: query !== debouncedQuery,
    /** Clear the search results */
    clear,
    /** The stops from the search results */
    stops: queryResult.data?.stops ?? [],
    /** Total number of results */
    total: queryResult.data?.total ?? 0,
  };
}

/**
 * Type for the useSearch return value
 */
export type UseSearchReturn = ReturnType<typeof useSearch>;

