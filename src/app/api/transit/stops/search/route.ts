/**
 * Unified Transit Stop Search API Route
 * GET /api/transit/stops/search?q=<query>&city=<city>&modes=<modes>&maxResults=<limit>
 * 
 * Uses the provider router to search stops in the appropriate transit system
 * based on the selected city. Supports TfL (London) and BODS (UK-wide) providers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProviderByCityId } from '@/lib/providers';
import { getCityOrDefault, isTflCityConfig } from '@/config/cities';
import { getStopDetails } from '@/lib/tfl-client';
import { arcgisClient } from '@/lib/arcgis-client';
import type { Stop, StopCode } from '@/types/tfl';

// ============================================================================
// Types
// ============================================================================

interface SearchResponse {
  success: boolean;
  data?: {
    total: number;
    query: string;
    city: string;
    provider: string;
    stops: Stop[];
  };
  error?: string;
  details?: unknown;
  timestamp?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Enrich TfL stops with detailed information including SMS codes
 */
async function enrichTflStops(stops: Stop[]): Promise<Stop[]> {
  const enrichedStops: Stop[] = [];
  
  // Collect all stop IDs for batch ArcGIS lookup
  const stopIds = stops.map(s => s.naptanId || s.id);
  
  // Get stop codes from ArcGIS
  let stopCodesMap = new Map<string, StopCode>();
  try {
    const arcgisResult = await arcgisClient.getStopCodesByAtcoCodes(stopIds);
    if (arcgisResult.success) {
      stopCodesMap = arcgisResult.data;
    }
  } catch (error) {
    console.warn('[Transit API] ArcGIS enrichment failed:', error);
  }
  
  for (const stop of stops.slice(0, 15)) {
    // For group stops, try to get child stop details
    if (stop.isGroup) {
      try {
        const detailResult = await getStopDetails({ stopId: stop.id });
        
        if (detailResult.success && detailResult.data?.children?.length) {
          // Expand group stop to show individual child stops
          for (const child of detailResult.data.children) {
            const childNaptanId = child.naptanId || child.id;
            const arcgisData = stopCodesMap.get(childNaptanId);
            
            enrichedStops.push({
              id: child.id,
              naptanId: child.naptanId,
              name: child.commonName,
              stopLetter: child.stopLetter || arcgisData?.stopLetter || undefined,
              // Use ArcGIS stopCode first, fallback to TfL smsCode
              stopCode: arcgisData?.stopCode || child.smsCode || undefined,
              direction: child.indicator || undefined,
              lat: child.lat,
              lon: child.lon,
              modes: child.modes,
              lines: child.lines?.map((line) => line.id) || [],
              isGroup: false,
            });
          }
          continue;
        }
      } catch (error) {
        console.warn('[Transit API] Failed to expand group stop:', stop.id, error);
      }
    }
    
    // For individual stops, try to get TfL details to get smsCode
    let tflSmsCode: string | undefined;
    if (!stop.stopCode) {
      try {
        const detailResult = await getStopDetails({ stopId: stop.id });
        if (detailResult.success && detailResult.data?.smsCode) {
          tflSmsCode = detailResult.data.smsCode;
        }
      } catch (error) {
        // Silently fail - we'll use ArcGIS data if available
      }
    }
    
    // Add individual stop with ArcGIS enrichment, fallback to TfL smsCode
    const arcgisData = stopCodesMap.get(stop.naptanId || stop.id);
    enrichedStops.push({
      ...stop,
      stopLetter: stop.stopLetter || arcgisData?.stopLetter || undefined,
      // Use ArcGIS stopCode first, then TfL smsCode, then existing stopCode
      stopCode: stop.stopCode || arcgisData?.stopCode || tflSmsCode,
    });
    
    if (enrichedStops.length >= 15) break;
  }
  
  return enrichedStops;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<SearchResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const cityId = searchParams.get('city') || 'london';
  const modes = searchParams.get('modes') || 'bus';
  const maxResultsParam = searchParams.get('maxResults');
  const maxResults = maxResultsParam ? parseInt(maxResultsParam, 10) : 20;

  // Validate query parameter
  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  if (query.trim().length < 2) {
    return NextResponse.json(
      { success: false, error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  const trimmedQuery = query.trim();

  try {
    // Get city configuration and provider
    const city = getCityOrDefault(cityId);
    const provider = getProviderByCityId(cityId);
    
    console.log(`[Transit API] Searching stops: "${trimmedQuery}" in ${city.name} via ${provider.providerName}`);

    // Search using the appropriate provider
    const result = await provider.searchStops({
      query: trimmedQuery,
      maxResults,
      modes: modes.split(','),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, details: result.details },
        { status: result.statusCode || 500 }
      );
    }

    let stops = result.data;

    // For TfL cities, enrich with additional data
    if (isTflCityConfig(city)) {
      stops = await enrichTflStops(stops);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          total: stops.length,
          query: trimmedQuery,
          city: city.id,
          provider: provider.providerId,
          stops,
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('[Transit API] Stop search error:', error);
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

