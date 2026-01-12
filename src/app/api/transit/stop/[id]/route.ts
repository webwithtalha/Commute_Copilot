/**
 * Unified Transit Stop Details API Route
 * GET /api/transit/stop/[id]?city=<city>
 * 
 * Returns stop details including child stops for group stops.
 * Uses the provider router to fetch data from the appropriate transit system.
 * Enriches TfL data with 5-digit stop codes from ArcGIS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProviderByCityId } from '@/lib/providers';
import { getCityOrDefault, isTflCityConfig } from '@/config/cities';
import { getStopDetails as getTflStopDetails, isGroupStopId } from '@/lib/tfl-client';
import { arcgisClient } from '@/lib/arcgis-client';
import type { Stop, StopCode } from '@/types/tfl';

// ============================================================================
// Types
// ============================================================================

interface StopDetailsResponse {
  success: boolean;
  data?: {
    stop: Stop;
    children?: Stop[];
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
// Route Handler
// ============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<StopDetailsResponse>> {
  const { id: stopId } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const cityId = searchParams.get('city') || 'london';

  if (!stopId || stopId.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Stop ID is required' },
      { status: 400 }
    );
  }

  try {
    // Get city configuration and provider
    const city = getCityOrDefault(cityId);
    const provider = getProviderByCityId(cityId);
    
    console.log(`[Transit API] Getting stop details: ${stopId} in ${city.name} via ${provider.providerName}`);

    // For TfL cities, use enhanced logic with ArcGIS enrichment
    if (isTflCityConfig(city)) {
      return await handleTflStopDetails(stopId, city, provider);
    }

    // For other providers (BODS, etc.), use the standard provider interface
    const result = await provider.getStopDetails({ stopId });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, details: result.details },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          stop: result.data,
          city: city.id,
          provider: provider.providerId,
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('[Transit API] Stop details error:', error);
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

// ============================================================================
// TfL-Specific Handler
// ============================================================================

/**
 * Handle TfL stop details with ArcGIS enrichment for stop codes
 */
async function handleTflStopDetails(
  stopId: string,
  city: { id: string },
  provider: { providerId: string }
): Promise<NextResponse<StopDetailsResponse>> {
  // Fetch stop details from TfL directly for richer data
  const result = await getTflStopDetails({ stopId });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, details: result.details },
      { status: result.statusCode || 500 }
    );
  }

  const tflStop = result.data;
  const isGroup = isGroupStopId(stopId) || Boolean(tflStop.children?.length);

  // Collect all stop IDs for ArcGIS enrichment
  const allStopIds: string[] = [tflStop.naptanId || tflStop.id];
  
  if (tflStop.children) {
    for (const child of tflStop.children) {
      allStopIds.push(child.naptanId || child.id);
    }
  }

  // Fetch stop codes from ArcGIS for all stops
  let stopCodesMap = new Map<string, StopCode>();
  try {
    const arcgisResult = await arcgisClient.getStopCodesByAtcoCodes(allStopIds);
    if (arcgisResult.success) {
      stopCodesMap = arcgisResult.data;
    }
  } catch (error) {
    console.warn('[Transit API] ArcGIS enrichment failed:', error);
  }

  // Transform main stop
  const mainArcgisData = stopCodesMap.get(tflStop.naptanId || tflStop.id);
  const mainStop: Stop = {
    id: tflStop.id,
    naptanId: tflStop.naptanId,
    name: tflStop.commonName,
    stopLetter: tflStop.stopLetter || mainArcgisData?.stopLetter || undefined,
    // Use ArcGIS stopCode first, fallback to TfL smsCode
    stopCode: mainArcgisData?.stopCode || tflStop.smsCode || undefined,
    direction: tflStop.indicator || mainArcgisData?.towards || undefined,
    lat: tflStop.lat,
    lon: tflStop.lon,
    modes: tflStop.modes,
    lines: tflStop.lines?.map((line) => line.id) || [],
    isGroup,
    childCount: tflStop.children?.length,
  };

  // Transform child stops if this is a group stop
  let children: Stop[] | undefined;
  if (isGroup && tflStop.children) {
    children = tflStop.children.map((child) => {
      const childArcgisData = stopCodesMap.get(child.naptanId || child.id);
      
      return {
        id: child.id,
        naptanId: child.naptanId,
        name: child.commonName,
        stopLetter: child.stopLetter || childArcgisData?.stopLetter || undefined,
        // Use ArcGIS stopCode first, fallback to TfL smsCode
        stopCode: childArcgisData?.stopCode || child.smsCode || undefined,
        direction: child.indicator || childArcgisData?.towards || undefined,
        lat: child.lat,
        lon: child.lon,
        modes: child.modes,
        lines: child.lines?.map((line) => line.id) || [],
        isGroup: false,
      };
    });

    // Sort children by stop letter if available
    children.sort((a, b) => {
      if (!a.stopLetter && !b.stopLetter) return 0;
      if (!a.stopLetter) return 1;
      if (!b.stopLetter) return -1;
      return a.stopLetter.localeCompare(b.stopLetter);
    });
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        stop: mainStop,
        children,
        city: city.id,
        provider: provider.providerId,
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
      },
    }
  );
}

