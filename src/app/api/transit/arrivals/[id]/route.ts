/**
 * Unified Transit Arrivals API Route
 * GET /api/transit/arrivals/[id]?city=<city>&lineIds=<lines>&count=<limit>
 * 
 * Returns real-time arrival predictions for a stop.
 * Uses the provider router to fetch data from the appropriate transit system.
 * Results are sorted by time to station (earliest first).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProviderByCityId } from '@/lib/providers';
import { getCityOrDefault, CITIES } from '@/config/cities';
import type { Arrival } from '@/types/tfl';

/**
 * Detect if a stop ID is a London TfL stop based on NaPTAN code format
 * London bus stops: 490XXXXXXX (490 prefix)
 * London tube/rail: 940XXXXXXX, 910XXXXXXX, etc.
 * Outside London: Various formats like sufajwgw (text-based ATCO codes)
 */
function isLondonStop(stopId: string): boolean {
  // London NaPTAN codes for bus are typically 490XXXXXXX
  // Other London modes use 940, 910, 930, etc.
  if (/^(490|940|910|930|920|950|960)\d+/i.test(stopId)) {
    return true;
  }

  // Check if it's a numeric ID that looks like a London format
  // London IDs are typically 9+ digits starting with specific prefixes
  if (/^\d{9,}$/.test(stopId) && /^[4-9]/.test(stopId)) {
    return true;
  }

  // Outside London ATCO codes are typically 8-character alphanumeric
  // or have a region prefix like "sufajwgw" (Suffolk)
  return false;
}

// ============================================================================
// Types
// ============================================================================

interface ArrivalWithFormatted extends Arrival {
  timeFormatted: string;
}

interface ArrivalsResponse {
  success: boolean;
  data?: {
    stopId: string;
    arrivals: ArrivalWithFormatted[];
    count: number;
    city: string;
    provider: string;
  };
  error?: string;
  details?: unknown;
  timestamp?: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format time to station in a human-readable format
 */
function formatTimeToStation(seconds: number): string {
  if (seconds < 30) {
    return 'Due';
  }
  
  const minutes = Math.floor(seconds / 60);
  
  if (minutes < 1) {
    return 'Due';
  }
  
  if (minutes === 1) {
    return '1 min';
  }
  
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (remainingMins === 0) {
      return `${hours} hr`;
    }
    return `${hours} hr ${remainingMins} min`;
  }
  
  return `${minutes} mins`;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ArrivalsResponse>> {
  const { id: stopId } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const cityId = searchParams.get('city') || 'london';
  
  // Parse optional parameters
  const lineIdsParam = searchParams.get('lineIds');
  const lineIds = lineIdsParam ? lineIdsParam.split(',').filter(Boolean) : undefined;
  const countParam = searchParams.get('count');
  const count = countParam ? parseInt(countParam, 10) : undefined;

  if (!stopId || stopId.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Stop ID is required' },
      { status: 400 }
    );
  }

  try {
    // Auto-detect provider based on stop ID format
    // This ensures we use the correct provider even if the user's city setting is wrong
    const detectedCityId = isLondonStop(stopId) ? 'london' : 'outside-london';
    const effectiveCityId = detectedCityId;

    // Get city configuration and provider
    const city = getCityOrDefault(effectiveCityId);
    const provider = getProviderByCityId(effectiveCityId);

    console.log(`[Transit API] Getting arrivals: ${stopId} in ${city.name} via ${provider.providerName} (detected from stop ID)`);

    // Fetch arrivals using the appropriate provider
    const result = await provider.getArrivals({
      stopId,
      lineIds,
      maxResults: count,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, details: result.details },
        { status: result.statusCode || 500 }
      );
    }

    // Add formatted time to each arrival
    const arrivalsWithFormatted: ArrivalWithFormatted[] = result.data.map((arrival) => ({
      ...arrival,
      timeFormatted: formatTimeToStation(arrival.timeToStation),
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          stopId,
          arrivals: arrivalsWithFormatted,
          count: arrivalsWithFormatted.length,
          city: city.id,
          provider: provider.providerId,
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          // Short cache for real-time data
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=5',
        },
      }
    );
  } catch (error) {
    console.error('[Transit API] Arrivals fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

