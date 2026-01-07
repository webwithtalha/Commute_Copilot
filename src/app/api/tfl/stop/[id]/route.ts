/**
 * TfL Stop Details API Route
 * GET /api/tfl/stop/[id]
 * 
 * Returns stop details including child stops for group stops.
 * Enriches data with 5-digit stop codes from ArcGIS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStopDetails, transformToStop, isGroupStopId } from '@/lib/tfl-client';
import { arcgisClient } from '@/lib/arcgis-client';
import type { Stop, StopCode } from '@/types/tfl';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id: stopId } = await context.params;

  if (!stopId || stopId.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Stop ID is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch stop details from TfL
    const result = await getStopDetails({ stopId });

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
    const arcgisResult = await arcgisClient.getStopCodesByAtcoCodes(allStopIds);
    if (arcgisResult.success) {
      stopCodesMap = arcgisResult.data;
    }

    // Transform main stop
    const mainArcgisData = stopCodesMap.get(tflStop.naptanId || tflStop.id);
    const mainStop: Stop = {
      id: tflStop.id,
      naptanId: tflStop.naptanId,
      name: tflStop.commonName,
      stopLetter: tflStop.stopLetter || mainArcgisData?.stopLetter || undefined,
      stopCode: mainArcgisData?.stopCode,
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
          stopCode: childArcgisData?.stopCode,
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
    console.error('Stop details error:', error);
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

