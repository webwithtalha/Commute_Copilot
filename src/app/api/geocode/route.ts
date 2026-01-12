/**
 * Geocoding API Route
 * Uses Nominatim (OpenStreetMap) for geocoding
 */

import { NextRequest, NextResponse } from 'next/server';

interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  boundingbox: string[];
}

interface GeocodingResult {
  lat: number;
  lon: number;
  displayName: string;
  address?: {
    road?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  try {
    // Use Nominatim API for geocoding
    // Add UK bias for better results
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'gb', // Bias towards UK
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'User-Agent': 'CommuteCopilot/1.0 (bus-arrivals-app)',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const results: NominatimResult[] = await response.json();

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No results found',
      });
    }

    // Transform results
    const geocodingResults: GeocodingResult[] = results.map((result) => ({
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      displayName: result.display_name,
      address: result.address
        ? {
            road: result.address.road,
            city: result.address.city || result.address.town || result.address.village,
            postcode: result.address.postcode,
            country: result.address.country,
          }
        : undefined,
    }));

    return NextResponse.json({
      success: true,
      data: geocodingResults,
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to geocode location',
      },
      { status: 500 }
    );
  }
}
