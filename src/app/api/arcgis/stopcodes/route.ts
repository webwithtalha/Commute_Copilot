/**
 * ArcGIS Stop Codes API Route
 * GET /api/arcgis/stopcodes?atcoCodes=<codes>&stopCode=<code>
 * 
 * Returns 5-digit stop codes and metadata from the TfL ArcGIS dataset.
 * Can query by ATCO codes (comma-separated) or a single 5-digit stop code.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getStopCodesByAtcoCodes,
  getStopByStopCode,
  isValidStopCode,
} from '@/lib/arcgis-client';
import type { StopCode } from '@/types/tfl';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const atcoCodesParam = searchParams.get('atcoCodes');
  const stopCodeParam = searchParams.get('stopCode');

  // Validate that at least one parameter is provided
  if (!atcoCodesParam && !stopCodeParam) {
    return NextResponse.json(
      {
        success: false,
        error: 'Either "atcoCodes" or "stopCode" parameter is required',
      },
      { status: 400 }
    );
  }

  try {
    // Handle 5-digit stop code query
    if (stopCodeParam) {
      const trimmedCode = stopCodeParam.trim();
      
      if (!isValidStopCode(trimmedCode)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid stop code format. Must be a 5-digit number.',
          },
          { status: 400 }
        );
      }

      const result = await getStopByStopCode(trimmedCode);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error, details: result.details },
          { status: 500 }
        );
      }

      if (!result.data) {
        return NextResponse.json(
          {
            success: true,
            data: {
              stopCode: null,
              found: false,
            },
            timestamp: new Date().toISOString(),
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
            },
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            stopCode: result.data,
            found: true,
          },
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
          },
        }
      );
    }

    // Handle ATCO codes query
    if (atcoCodesParam) {
      const atcoCodes = atcoCodesParam
        .split(',')
        .map((code) => code.trim())
        .filter(Boolean);

      if (atcoCodes.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid ATCO codes provided' },
          { status: 400 }
        );
      }

      // Limit the number of codes per request
      if (atcoCodes.length > 50) {
        return NextResponse.json(
          {
            success: false,
            error: 'Maximum 50 ATCO codes per request',
          },
          { status: 400 }
        );
      }

      const result = await getStopCodesByAtcoCodes(atcoCodes);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error, details: result.details },
          { status: 500 }
        );
      }

      // Convert Map to object for JSON serialization
      const stopCodesObject: Record<string, StopCode> = {};
      result.data.forEach((value, key) => {
        stopCodesObject[key] = value;
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            stopCodes: stopCodesObject,
            requested: atcoCodes.length,
            found: Object.keys(stopCodesObject).length,
          },
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
          },
        }
      );
    }

    // This shouldn't be reached, but just in case
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Stop codes fetch error:', error);
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

