'use client';

import { useMutation } from '@tanstack/react-query';
import type { Stop } from '@/types/tfl';
import type {
  JourneyApiResponse,
  JourneyPlanningResponse,
  JourneyRecommendation,
  WeatherConditions,
  isJourneySuccess,
} from '@/types/assistant';

/**
 * Parameters for planning a journey
 */
interface PlanJourneyParams {
  /** Destination stop */
  destination: Stop;
  /** Desired arrival time */
  arrivalTime: Date;
  /** User's current location (optional) */
  userLocation?: {
    lat: number;
    lon: number;
  };
}

/**
 * Result from the journey planner
 */
interface JourneyPlannerResult {
  recommendations: JourneyRecommendation[];
  weather: WeatherConditions | null;
  destinationName: string;
}

/**
 * Fetch journey recommendations from the API
 */
async function fetchJourneyPlan(
  params: PlanJourneyParams
): Promise<JourneyPlannerResult> {
  const response = await fetch('/api/assistant/journey', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destinationStopId: params.destination.naptanId,
      desiredArrivalTime: params.arrivalTime.toISOString(),
      originLat: params.userLocation?.lat,
      originLon: params.userLocation?.lon,
    }),
  });

  const data: JourneyApiResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to plan journey');
  }

  return {
    recommendations: data.recommendations,
    weather: data.weather,
    destinationName: data.destinationName,
  };
}

/**
 * Hook for planning journeys with the AI assistant
 *
 * @returns Mutation result with journey planning function
 *
 * @example
 * ```tsx
 * const { planJourney, isLoading, error, data } = useJourneyPlanner();
 *
 * // Trigger journey planning
 * planJourney({
 *   destination: selectedStop,
 *   arrivalTime: new Date('2024-01-18T09:00:00'),
 * });
 *
 * // Access results
 * if (data) {
 *   console.log(data.recommendations);
 * }
 * ```
 */
export function useJourneyPlanner() {
  const mutation = useMutation<JourneyPlannerResult, Error, PlanJourneyParams>({
    mutationFn: fetchJourneyPlan,
  });

  return {
    /** Plan a journey with the given parameters */
    planJourney: mutation.mutate,
    /** Plan a journey and return a promise */
    planJourneyAsync: mutation.mutateAsync,
    /** Whether the request is in progress */
    isLoading: mutation.isPending,
    /** Error message if the request failed */
    error: mutation.error?.message || null,
    /** The journey planning results */
    data: mutation.data || null,
    /** Recommendations from the result */
    recommendations: mutation.data?.recommendations || [],
    /** Weather conditions from the result */
    weather: mutation.data?.weather || null,
    /** Destination name from the result */
    destinationName: mutation.data?.destinationName || null,
    /** Reset the mutation state */
    reset: mutation.reset,
    /** Whether the mutation has been called */
    isIdle: mutation.isIdle,
    /** Whether the mutation was successful */
    isSuccess: mutation.isSuccess,
    /** Whether the mutation failed */
    isError: mutation.isError,
  };
}

/**
 * Type for the useJourneyPlanner return value
 */
export type UseJourneyPlannerReturn = ReturnType<typeof useJourneyPlanner>;
