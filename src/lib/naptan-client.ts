/**
 * NaPTAN Client for UK-wide Bus Stop Search
 *
 * Uses Nominatim for fast bus stop search, then enriches with NaPTAN data from Overpass.
 * This two-step approach is faster and more reliable than searching Overpass directly.
 */

import type { Stop, ApiResponse } from '@/types/tfl';

// ============================================================================
// Configuration
// ============================================================================

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// ============================================================================
// Types
// ============================================================================

interface NominatimResult {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  class: string;
  type: string;
  name: string;
  display_name: string;
  address?: {
    highway?: string;
    road?: string;
    suburb?: string;
    town?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface OverpassElement {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform a Nominatim result to our Stop type
 */
function transformNominatimToStop(result: NominatimResult, naptanTags?: Record<string, string>): Stop {
  const tags = naptanTags || {};
  const addr = result.address || {};

  // Build stop name with location context
  let name = tags['naptan:CommonName'] || result.name || 'Bus Stop';
  const location = addr.town || addr.city || addr.suburb || addr.county;
  if (location && !name.toLowerCase().includes(location.toLowerCase())) {
    name = `${name}, ${location}`;
  }

  // Get IDs
  const atcoCode = tags['naptan:AtcoCode'];
  const naptanCode = tags['naptan:NaptanCode'];
  const id = atcoCode || `osm-${result.osm_id}`;

  // Extract stop letter from indicator
  let stopLetter: string | undefined;
  const indicator = tags['naptan:Indicator'] || tags.local_ref;
  if (indicator) {
    const match = indicator.match(/^([A-Z0-9])$|(?:Stop|Stand|Bay)\s*([A-Z0-9]+)/i);
    if (match) {
      stopLetter = (match[1] || match[2]).toUpperCase();
    } else if (['adj', 'opp', 'o/s', 'nr', 'outside'].includes(indicator.toLowerCase())) {
      stopLetter = indicator;
    }
  }

  // Get direction from bearing
  let direction: string | undefined;
  const bearing = tags['naptan:Bearing'];
  if (bearing) {
    const bearingMap: Record<string, string> = {
      'N': 'Northbound', 'S': 'Southbound',
      'E': 'Eastbound', 'W': 'Westbound',
      'NE': 'North East', 'NW': 'North West',
      'SE': 'South East', 'SW': 'South West',
    };
    direction = bearingMap[bearing] || bearing;
  }

  return {
    id,
    naptanId: id,
    name,
    stopLetter,
    stopCode: naptanCode,
    direction,
    lat: parseFloat(result.lat),
    lon: parseFloat(result.lon),
    modes: ['bus'],
    lines: [],
    isGroup: false,
  };
}

/**
 * Fetch NaPTAN tags for multiple OSM node IDs
 */
async function fetchNaptanTags(osmIds: number[]): Promise<Map<number, Record<string, string>>> {
  if (osmIds.length === 0) return new Map();

  try {
    const query = `[out:json][timeout:5];(${osmIds.map(id => `node(${id});`).join('')});out tags;`;

    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return new Map();

    const data = await response.json() as OverpassResponse;
    const tagsMap = new Map<number, Record<string, string>>();

    for (const element of data.elements || []) {
      if (element.tags) {
        tagsMap.set(element.id, element.tags);
      }
    }

    return tagsMap;
  } catch (error) {
    console.warn('[NaPTAN] Failed to fetch NaPTAN tags:', error);
    return new Map();
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Search for bus stops by name using Nominatim + Overpass enrichment
 */
export async function searchStopsByName(
  query: string,
  maxResults: number = 15
): Promise<ApiResponse<Stop[]>> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return { success: false, error: 'Search query must be at least 2 characters' };
  }

  console.log(`[NaPTAN] Searching for: "${trimmedQuery}"`);
  const startTime = Date.now();

  try {
    // Step 1: Search Nominatim for bus stops
    const searchParams = new URLSearchParams({
      q: `${trimmedQuery} bus stop`,
      format: 'json',
      addressdetails: '1',
      limit: String(maxResults * 2),
      countrycodes: 'gb',
    });

    const nominatimResponse = await fetch(`${NOMINATIM_URL}?${searchParams}`, {
      headers: {
        'User-Agent': 'CommuteCopilot/1.0 (bus stop search)',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!nominatimResponse.ok) {
      console.error(`[NaPTAN] Nominatim error: ${nominatimResponse.status}`);
      return { success: true, data: [], timestamp: new Date().toISOString() };
    }

    const nominatimResults: NominatimResult[] = await nominatimResponse.json();
    console.log(`[NaPTAN] Nominatim returned ${nominatimResults.length} results in ${Date.now() - startTime}ms`);

    // Filter to only bus stops
    const busStops = nominatimResults.filter(
      r => r.class === 'highway' && r.type === 'bus_stop' && r.osm_type === 'node'
    );

    if (busStops.length === 0) {
      console.log(`[NaPTAN] No bus stops found in ${Date.now() - startTime}ms`);
      return { success: true, data: [], timestamp: new Date().toISOString() };
    }

    // Step 2: Fetch NaPTAN tags from Overpass
    const osmIds = busStops.map(r => r.osm_id);
    const naptanTags = await fetchNaptanTags(osmIds);
    console.log(`[NaPTAN] Fetched NaPTAN tags for ${naptanTags.size} stops`);

    // Step 3: Transform results
    const seenIds = new Set<string>();
    const stops: Stop[] = [];

    for (const result of busStops) {
      const tags = naptanTags.get(result.osm_id);
      const stop = transformNominatimToStop(result, tags);

      if (!seenIds.has(stop.id)) {
        seenIds.add(stop.id);
        stops.push(stop);
        if (stops.length >= maxResults) break;
      }
    }

    console.log(`[NaPTAN] Returning ${stops.length} stops in ${Date.now() - startTime}ms`);

    return {
      success: true,
      data: stops,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[NaPTAN] Search error:', error);
    return { success: true, data: [], timestamp: new Date().toISOString() };
  }
}

/**
 * Get stop details by ATCO code or OSM ID
 */
export async function getStopDetails(stopId: string): Promise<ApiResponse<Stop | null>> {
  console.log(`[NaPTAN] Getting stop details for: ${stopId}`);

  try {
    let query: string;

    if (stopId.startsWith('osm-')) {
      const osmId = stopId.replace('osm-', '');
      query = `[out:json][timeout:5];node(${osmId});out body;`;
    } else {
      query = `[out:json][timeout:5];node["naptan:AtcoCode"="${stopId}"];out body;`;
    }

    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(6000),
    });

    if (response.ok) {
      const data = await response.json() as OverpassResponse;
      if (data.elements?.length > 0 && data.elements[0].lat) {
        const element = data.elements[0];
        const tags = element.tags || {};

        // Create a mock Nominatim result for transformation
        const mockResult: NominatimResult = {
          place_id: 0,
          osm_type: 'node',
          osm_id: element.id,
          lat: String(element.lat),
          lon: String(element.lon),
          class: 'highway',
          type: 'bus_stop',
          name: tags['naptan:CommonName'] || tags.name || 'Bus Stop',
          display_name: '',
        };

        return {
          success: true,
          data: transformNominatimToStop(mockResult, tags),
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (error) {
    console.warn('[NaPTAN] Get stop details failed:', error);
  }

  // Return placeholder
  return {
    success: true,
    data: {
      id: stopId,
      naptanId: stopId,
      name: `Stop ${stopId}`,
      lat: 0,
      lon: 0,
      modes: ['bus'],
      lines: [],
      isGroup: false,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Search for a stop by code (NaPTAN or ATCO)
 */
export async function getStopByStopCode(stopCode: string): Promise<ApiResponse<Stop | null>> {
  console.log(`[NaPTAN] Searching for stop code: ${stopCode}`);

  try {
    const query = `
[out:json][timeout:5];
(
  node["naptan:NaptanCode"="${stopCode}"];
  node["naptan:AtcoCode"="${stopCode}"];
);
out body 1;
`.trim();

    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(6000),
    });

    if (response.ok) {
      const data = await response.json() as OverpassResponse;
      if (data.elements?.length > 0 && data.elements[0].lat) {
        const element = data.elements[0];
        const tags = element.tags || {};

        const mockResult: NominatimResult = {
          place_id: 0,
          osm_type: 'node',
          osm_id: element.id,
          lat: String(element.lat),
          lon: String(element.lon),
          class: 'highway',
          type: 'bus_stop',
          name: tags['naptan:CommonName'] || tags.name || 'Bus Stop',
          display_name: '',
        };

        return {
          success: true,
          data: transformNominatimToStop(mockResult, tags),
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (error) {
    console.warn('[NaPTAN] Stop code search failed:', error);
  }

  return { success: true, data: null, timestamp: new Date().toISOString() };
}

// ============================================================================
// Export
// ============================================================================

export const naptanClient = {
  searchStopsByName,
  getStopDetails,
  getStopByStopCode,
};

export default naptanClient;
