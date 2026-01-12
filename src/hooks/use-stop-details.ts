'use client';

import { useQuery } from '@tanstack/react-query';
import type { Stop, ApiResponse } from '@/types/tfl';
import { useCity } from '@/context/city-context';

/**
 * Response shape from /api/transit/stop/[id]
 */
interface StopDetailsResponse {
  stop: Stop;
  children?: Stop[];
  city: string;
  provider: string;
}

/**
 * Parameters for the useStopDetails hook
 */
interface UseStopDetailsParams {
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for fetching stop details including child stops
 * 
 * @param stopId - The stop ID or NaPTAN ID to fetch details for
 * @param params - Optional parameters
 * @returns Query result with stop details and children
 * 
 * @example
 * ```tsx
 * const { stop, children, isLoading, error } = useStopDetails('490G00008481');
 * ```
 */
export function useStopDetails(stopId: string | null, params: UseStopDetailsParams = {}) {
  const { enabled = true } = params;

  // Get current city from context
  const { cityId } = useCity();

  const shouldFetch = enabled && Boolean(stopId?.trim());

  const queryResult = useQuery<StopDetailsResponse>({
    queryKey: ['stop', 'details', stopId, cityId],
    queryFn: async () => {
      if (!stopId) throw new Error('Stop ID is required');

      const response = await fetch(`/api/transit/stop/${encodeURIComponent(stopId)}?city=${encodeURIComponent(cityId)}`);
      const data: ApiResponse<StopDetailsResponse> = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          'error' in data ? data.error : 'Failed to fetch stop details'
        );
      }

      return data.data;
    },
    enabled: shouldFetch,
    // Stop structure rarely changes, cache for 1 hour
    staleTime: 60 * 60 * 1000,
    // Keep in cache for 2 hours
    gcTime: 2 * 60 * 60 * 1000,
  });

  return {
    ...queryResult,
    /** The main stop details */
    stop: queryResult.data?.stop ?? null,
    /** Child stops (for group stops) */
    children: queryResult.data?.children ?? [],
    /** Whether this is a group stop with children */
    isGroup: Boolean(queryResult.data?.children?.length),
  };
}

/**
 * Type for the useStopDetails return value
 */
export type UseStopDetailsReturn = ReturnType<typeof useStopDetails>;

