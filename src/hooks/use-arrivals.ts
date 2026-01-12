'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import type { Arrival, ApiResponse } from '@/types/tfl';
import { useCity } from '@/context/city-context';

/**
 * Response shape from /api/transit/arrivals/[id]
 */
interface ArrivalsResponse {
  stopId: string;
  arrivals: (Arrival & { timeFormatted: string })[];
  count: number;
  city: string;
  provider: string;
}

/**
 * Parameters for the useArrivals hook
 */
interface UseArrivalsParams {
  /** Filter by specific line IDs */
  lineIds?: string[];
  /** Filter by direction */
  direction?: 'inbound' | 'outbound' | 'all';
  /** Maximum number of arrivals to return */
  count?: number;
  /** Auto-refresh interval in milliseconds (default: 15000ms / 15 seconds) */
  refreshInterval?: number;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for fetching live arrivals with auto-refresh
 * 
 * @param stopId - The stop ID or NaPTAN ID to fetch arrivals for
 * @param params - Optional parameters for filtering and refresh
 * @returns Query result with arrivals data and refresh controls
 * 
 * @example
 * ```tsx
 * const { arrivals, isLoading, lastUpdated, refresh, secondsUntilRefresh } = useArrivals(
 *   '490008481E',
 *   { refreshInterval: 15000 }
 * );
 * ```
 */
export function useArrivals(stopId: string | null, params: UseArrivalsParams = {}) {
  const {
    lineIds,
    direction,
    count,
    refreshInterval = 15000, // 15 seconds default
    enabled = true,
  } = params;

  // Get current city from context
  const { cityId } = useCity();

  const queryClient = useQueryClient();
  
  // Track seconds until next refresh for UI countdown
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(
    Math.floor(refreshInterval / 1000)
  );

  const shouldFetch = enabled && Boolean(stopId?.trim());

  const queryResult = useQuery<ArrivalsResponse>({
    queryKey: ['arrivals', stopId, lineIds, direction, count, cityId],
    queryFn: async () => {
      if (!stopId) throw new Error('Stop ID is required');

      const searchParams = new URLSearchParams();
      searchParams.set('city', cityId);
      if (lineIds?.length) {
        searchParams.set('lineIds', lineIds.join(','));
      }
      if (direction) {
        searchParams.set('direction', direction);
      }
      if (count) {
        searchParams.set('count', count.toString());
      }

      const queryString = searchParams.toString();
      const url = `/api/transit/arrivals/${encodeURIComponent(stopId)}${
        queryString ? `?${queryString}` : ''
      }`;

      const response = await fetch(url);
      const data: ApiResponse<ArrivalsResponse> = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          'error' in data ? data.error : 'Failed to fetch arrivals'
        );
      }

      return data.data;
    },
    enabled: shouldFetch,
    // Real-time data should be considered stale immediately
    staleTime: 0,
    // Auto-refresh at the specified interval
    refetchInterval: shouldFetch ? refreshInterval : false,
    // Keep previous data while refetching for smooth UX
    placeholderData: (previousData) => previousData,
    // Retry once on failure
    retry: 1,
    // Refetch when window regains focus (important for real-time data)
    refetchOnWindowFocus: true,
  });

  // Countdown timer for UI
  useEffect(() => {
    if (!shouldFetch) return;

    // Reset countdown when data is fetched
    setSecondsUntilRefresh(Math.floor(refreshInterval / 1000));

    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          return Math.floor(refreshInterval / 1000);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [shouldFetch, refreshInterval, queryResult.dataUpdatedAt]);

  // Manual refresh function
  const refresh = useCallback(() => {
    if (stopId) {
      queryClient.invalidateQueries({
        queryKey: ['arrivals', stopId, lineIds, direction, count, cityId],
      });
      setSecondsUntilRefresh(Math.floor(refreshInterval / 1000));
    }
  }, [queryClient, stopId, lineIds, direction, count, refreshInterval, cityId]);

  // Pause/resume auto-refresh
  const [isPaused, setIsPaused] = useState(false);
  
  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    refresh();
  }, [refresh]);

  return {
    ...queryResult,
    /** The arrivals from the response */
    arrivals: queryResult.data?.arrivals ?? [],
    /** Total count of arrivals */
    count: queryResult.data?.count ?? 0,
    /** Seconds until next auto-refresh */
    secondsUntilRefresh,
    /** Manually trigger a refresh */
    refresh,
    /** Whether auto-refresh is paused */
    isPaused,
    /** Pause auto-refresh */
    pause,
    /** Resume auto-refresh */
    resume,
    /** Timestamp of last successful data fetch */
    lastUpdated: queryResult.dataUpdatedAt
      ? new Date(queryResult.dataUpdatedAt)
      : null,
  };
}

/**
 * Type for the useArrivals return value
 */
export type UseArrivalsReturn = ReturnType<typeof useArrivals>;

