/**
 * Nearby Stops Hook
 *
 * Fetches bus stops near a given location using React Query.
 */

import { useQuery } from '@tanstack/react-query';
import { useCity } from '@/context';
import type { Stop, ApiResponse } from '@/types/tfl';

export interface UseNearbyStopsOptions {
  /** Latitude */
  lat: number | null;
  /** Longitude */
  lon: number | null;
  /** Radius in meters (default: 500) */
  radius?: number;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseNearbyStopsReturn {
  /** Array of nearby stops */
  stops: Stop[];
  /** Whether stops are loading */
  isLoading: boolean;
  /** Whether stops are being refetched */
  isFetching: boolean;
  /** Error message if any */
  error: Error | null;
  /** Refetch nearby stops */
  refetch: () => void;
}

async function fetchNearbyStops(
  lat: number,
  lon: number,
  radius: number,
  cityId: string
): Promise<Stop[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius: radius.toString(),
    city: cityId,
  });

  const response = await fetch(`/api/transit/stops/nearby?${params}`);

  if (!response.ok) {
    throw new Error('Failed to fetch nearby stops');
  }

  const data: ApiResponse<Stop[]> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch nearby stops');
  }

  return data.data || [];
}

export function useNearbyStops(options: UseNearbyStopsOptions): UseNearbyStopsReturn {
  const { lat, lon, radius = 500, enabled = true } = options;
  const { city } = useCity();

  const queryEnabled = enabled && lat !== null && lon !== null;

  const {
    data: stops = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['nearbyStops', lat, lon, radius, city.id],
    queryFn: () => fetchNearbyStops(lat!, lon!, radius, city.id),
    enabled: queryEnabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    retry: 1,
  });

  return {
    stops,
    isLoading: queryEnabled && isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}

export default useNearbyStops;
