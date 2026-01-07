/**
 * TfL Stop Search API Route
 * GET /api/tfl/stops/search?q=<query>&modes=<modes>&maxResults=<limit>
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchStops, getStopDetails } from '@/lib/tfl-client';
import type { Stop } from '@/types/tfl';

/**
 * Extract line IDs from a lines array that might contain strings or objects
 */
function extractLineIds(lines: unknown[] | undefined): string[] {
  if (!lines || !Array.isArray(lines)) return [];
  
  return lines.map((line) => {
    if (typeof line === 'string') return line;
    if (typeof line === 'object' && line !== null) {
      // Handle line objects from TfL API
      const lineObj = line as Record<string, unknown>;
      return String(lineObj.id || lineObj.name || '');
    }
    return '';
  }).filter(Boolean);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
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

  // Check if query is a 5-digit stop code
  const trimmedQuery = query.trim();
  const isStopCodeSearch = /^\d{5}$/.test(trimmedQuery);

  try {
    // If it's a 5-digit stop code, search TfL for SMS code matches
    if (isStopCodeSearch) {
      console.log(`[Search] Looking up stop code ${trimmedQuery} via TfL search...`);
      
      // TfL search can find stops by SMS code
      const tflResult = await searchStops({
        query: trimmedQuery,
        modes,
        maxResults: 5,
      });
      
      if (tflResult.success && tflResult.data.matches.length > 0) {
        // Get stop details for each match to retrieve smsCode
        const stopsWithDetails = await Promise.all(
          tflResult.data.matches.slice(0, 5).map(async (match) => {
            // Try to get full stop details which includes smsCode
            const detailResult = await getStopDetails({ stopId: match.id });
            
            if (detailResult.success && detailResult.data) {
              const tflStop = detailResult.data;
              return {
                id: tflStop.id,
                naptanId: tflStop.naptanId,
                name: tflStop.commonName,
                stopLetter: tflStop.stopLetter || undefined,
                stopCode: tflStop.smsCode || undefined, // Use smsCode from TfL!
                direction: tflStop.indicator || undefined,
                lat: tflStop.lat,
                lon: tflStop.lon,
                modes: tflStop.modes,
                lines: tflStop.lines?.map((line) => line.id) || [],
                isGroup: tflStop.id.startsWith('490G') || Boolean(tflStop.children?.length),
                childCount: tflStop.children?.length,
              } as Stop;
            }
            
            // Fallback to basic match data if details fail
            return {
              id: match.id,
              naptanId: match.id,
              name: match.name,
              stopLetter: match.stopLetter || undefined,
              lat: match.lat,
              lon: match.lon,
              modes: match.modes,
              lines: extractLineIds(match.lines as unknown[]),
              isGroup: match.id.startsWith('490G'),
            } as Stop;
          })
        );

        return NextResponse.json(
          {
            success: true,
            data: {
              total: stopsWithDetails.length,
              query: trimmedQuery,
              stops: stopsWithDetails,
            },
            timestamp: new Date().toISOString(),
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
            },
          }
        );
      }
    }

    // Standard name-based search via TfL API
    const result = await searchStops({
      query: trimmedQuery,
      modes,
      maxResults,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, details: result.details },
        { status: result.statusCode || 500 }
      );
    }

    // Get full stop details for each match and expand group stops to show child stops
    // This ensures we get smsCode for individual stops
    const allStops: Stop[] = [];
    
    for (const match of result.data.matches.slice(0, 15)) {
      // Try to get full stop details
      const detailResult = await getStopDetails({ stopId: match.id });
      
      if (detailResult.success && detailResult.data) {
        const tflStop = detailResult.data;
        const isGroupStop = tflStop.id.startsWith('490G') || Boolean(tflStop.children?.length);
        
        // If it's a group stop with children, expand to show individual child stops
        if (isGroupStop && tflStop.children && tflStop.children.length > 0) {
          // Get details for each child stop to get smsCode
          for (const child of tflStop.children) {
            // Fetch child stop details to get smsCode
            const childDetailResult = await getStopDetails({ stopId: child.naptanId || child.id });
            
            if (childDetailResult.success && childDetailResult.data) {
              const childDetails = childDetailResult.data;
              allStops.push({
                id: child.id,
                naptanId: child.naptanId,
                name: child.commonName,
                stopLetter: child.stopLetter || undefined,
                stopCode: childDetails.smsCode || undefined, // Get smsCode from child details
                direction: child.indicator || undefined,
                lat: child.lat,
                lon: child.lon,
                modes: child.modes,
                lines: child.lines?.map((line) => line.id) || [],
                isGroup: false,
              });
            } else {
              // Fallback without smsCode if child detail fetch fails
              allStops.push({
                id: child.id,
                naptanId: child.naptanId,
                name: child.commonName,
                stopLetter: child.stopLetter || undefined,
                direction: child.indicator || undefined,
                lat: child.lat,
                lon: child.lon,
                modes: child.modes,
                lines: child.lines?.map((line) => line.id) || [],
                isGroup: false,
              });
            }
          }
        } else {
          // Non-group stop or group without children
          allStops.push({
            id: tflStop.id,
            naptanId: tflStop.naptanId,
            name: tflStop.commonName,
            stopLetter: tflStop.stopLetter || undefined,
            stopCode: tflStop.smsCode || undefined,
            direction: tflStop.indicator || undefined,
            lat: tflStop.lat,
            lon: tflStop.lon,
            modes: tflStop.modes,
            lines: tflStop.lines?.map((line) => line.id) || [],
            isGroup: isGroupStop,
            childCount: tflStop.children?.length,
          });
        }
      } else {
        // Fallback to basic match data if details fail
        allStops.push({
          id: match.id,
          naptanId: match.id,
          name: match.name,
          stopLetter: match.stopLetter || undefined,
          lat: match.lat,
          lon: match.lon,
          modes: match.modes,
          lines: extractLineIds(match.lines as unknown[]),
          isGroup: match.id.startsWith('490G'),
        });
      }
      
      // Limit total results
      if (allStops.length >= 15) break;
    }
    
    const stops = allStops;

    return NextResponse.json(
      {
        success: true,
        data: {
          total: result.data.total,
          query: trimmedQuery,
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
    console.error('Stop search error:', error);
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

