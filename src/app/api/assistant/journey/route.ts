/**
 * AI Journey Planning API Route
 * POST /api/assistant/journey
 *
 * Orchestrates journey planning by:
 * 1. Fetching stop details
 * 2. Getting real-time arrivals
 * 3. Fetching weather conditions
 * 4. Calling Claude for analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProviderByCityId } from '@/lib/providers';
import { getCityOrDefault } from '@/config/cities';
import { getWeather } from '@/lib/weather-client';
import { analyzeJourney, generateFallbackRecommendations } from '@/lib/claude-client';
import type { JourneyRequest, JourneyApiResponse, ClaudeJourneyInput } from '@/types/assistant';

// ============================================================================
// Types
// ============================================================================

interface RequestBody extends JourneyRequest {
  cityId?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect if a stop ID is a London TfL stop based on NaPTAN code format
 */
function isLondonStop(stopId: string): boolean {
  if (/^(490|940|910|930|920|950|960)\d+/i.test(stopId)) {
    return true;
  }
  if (/^\d{9,}$/.test(stopId) && /^[4-9]/.test(stopId)) {
    return true;
  }
  return false;
}

/**
 * Validate request body
 */
function validateRequest(body: unknown): body is RequestBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  if (!b.destinationStopId || typeof b.destinationStopId !== 'string') return false;
  if (!b.desiredArrivalTime || typeof b.desiredArrivalTime !== 'string') return false;

  // Validate ISO 8601 date
  const date = new Date(b.desiredArrivalTime as string);
  if (isNaN(date.getTime())) return false;

  return true;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<JourneyApiResponse>> {
  try {
    const body = await request.json();

    if (!validateRequest(body)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request. Required: destinationStopId (string), desiredArrivalTime (ISO 8601)',
        },
        { status: 400 }
      );
    }

    const { destinationStopId, desiredArrivalTime, originLat, originLon, cityId } = body;

    console.log('[Journey API] Planning journey to:', destinationStopId);

    // Auto-detect provider based on stop ID
    const detectedCityId = isLondonStop(destinationStopId) ? 'london' : 'outside-london';
    const effectiveCityId = cityId || detectedCityId;
    const city = getCityOrDefault(effectiveCityId);
    const provider = getProviderByCityId(effectiveCityId);

    // Fetch stop details
    console.log('[Journey API] Fetching stop details...');
    const stopResult = await provider.getStopDetails({ stopId: destinationStopId });

    if (!stopResult.success || !stopResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: `Stop not found: ${destinationStopId}`,
          code: 'STOP_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const stop = stopResult.data;

    // Fetch arrivals
    console.log('[Journey API] Fetching arrivals...');
    const arrivalsResult = await provider.getArrivals({
      stopId: destinationStopId,
      maxResults: 20,
    });

    const arrivals = arrivalsResult.success && arrivalsResult.data ? arrivalsResult.data : [];

    // Fetch weather
    console.log('[Journey API] Fetching weather...');
    const weather = await getWeather(stop.lat, stop.lon);

    // Prepare input for Claude
    const claudeInput: ClaudeJourneyInput = {
      destinationStop: {
        id: stop.naptanId,
        name: stop.name,
        lat: stop.lat,
        lon: stop.lon,
        lines: stop.lines,
      },
      arrivals: arrivals.map((a) => ({
        lineName: a.lineName,
        destinationName: a.destination || 'Unknown',
        expectedArrival: a.expectedArrival instanceof Date
          ? a.expectedArrival.toISOString()
          : String(a.expectedArrival),
        timeToStation: a.timeToStation,
      })),
      weather,
      desiredArrivalTime,
      currentTime: new Date().toISOString(),
      userLocation: originLat !== undefined && originLon !== undefined
        ? { lat: originLat, lon: originLon }
        : undefined,
    };

    // Call Claude for analysis
    let recommendations;
    let warnings;

    try {
      console.log('[Journey API] Analyzing with Claude...');
      const result = await analyzeJourney(claudeInput);
      recommendations = result.recommendations;
      warnings = result.warnings;
    } catch (error) {
      console.error('[Journey API] Claude error, using fallback:', error);
      // Use fallback if Claude fails
      const fallback = generateFallbackRecommendations(claudeInput);
      recommendations = fallback.recommendations;
      warnings = [
        ...fallback.warnings,
        {
          type: 'reliability' as const,
          severity: 'warning' as const,
          message: 'AI analysis unavailable. Showing estimated times.',
        },
      ];
    }

    // Add any warnings to recommendations
    recommendations = recommendations.map((rec) => ({
      ...rec,
      warnings: [...rec.warnings, ...warnings.filter((w) => w.severity !== 'info')],
    }));

    return NextResponse.json(
      {
        success: true,
        recommendations,
        weather,
        destinationName: stop.name,
        requestedArrivalTime: desiredArrivalTime,
      },
      {
        headers: {
          // Short cache for real-time data
          'Cache-Control': 'private, no-cache',
        },
      }
    );
  } catch (error) {
    console.error('[Journey API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
