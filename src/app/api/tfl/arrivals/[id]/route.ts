/**
 * TfL Live Arrivals API Route
 * GET /api/tfl/arrivals/[id]?lineIds=<lines>&direction=<dir>&count=<limit>
 * 
 * Returns real-time arrival predictions for a stop.
 * Results are sorted by time to station (earliest first).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getArrivals, transformToArrival, formatTimeToStation } from '@/lib/tfl-client';
import type { Arrival } from '@/types/tfl';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id: stopId } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  
  // Parse optional parameters
  const lineIdsParam = searchParams.get('lineIds');
  const lineIds = lineIdsParam ? lineIdsParam.split(',').filter(Boolean) : undefined;
  const direction = searchParams.get('direction') as 'inbound' | 'outbound' | 'all' | null;
  const countParam = searchParams.get('count');
  const count = countParam ? parseInt(countParam, 10) : undefined;

  if (!stopId || stopId.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Stop ID is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch arrivals from TfL
    const result = await getArrivals({
      stopId,
      lineIds,
      direction: direction || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, details: result.details },
        { status: result.statusCode || 500 }
      );
    }

    // Transform TfL arrivals to application format
    let arrivals: Arrival[] = result.data.map(transformToArrival);

    // Apply count limit if specified
    if (count && count > 0) {
      arrivals = arrivals.slice(0, count);
    }

    // Add formatted time to each arrival for convenience
    const arrivalsWithFormatted = arrivals.map((arrival) => ({
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
    console.error('Arrivals fetch error:', error);
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

