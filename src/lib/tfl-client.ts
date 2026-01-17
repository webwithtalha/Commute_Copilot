/**
 * TfL Unified API Client
 * Server-side wrapper for the TfL API
 * @see https://api.tfl.gov.uk/
 */

import type {
  TflStopPoint,
  TflSearchResponse,
  TflArrival,
  TflLineStatus,
  Stop,
  Arrival,
  ApiResponse,
} from '@/types/tfl';

// ============================================================================
// Configuration
// ============================================================================

const TFL_API_BASE_URL = 'https://api.tfl.gov.uk';

/**
 * Get the TfL API key from environment variables
 * Returns null if not set (anonymous access is allowed but rate limited)
 */
function getApiKey(): string | null {
  const apiKey = process.env.TFL_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.warn(
      '⚠️  TFL_API_KEY not set. Using anonymous access (50 req/min limit).\n' +
      '   To get an API key:\n' +
      '   1. Go to https://api-portal.tfl.gov.uk/\n' +
      '   2. Create an account and subscribe to "500 requests per minute"\n' +
      '   3. Copy your API key from the Profile section\n' +
      '   4. Add TFL_API_KEY=your_key_here to your .env.local file\n'
    );
    return null;
  }
  return apiKey;
}

/**
 * Build URL with query parameters including API key (if available)
 */
function buildUrl(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {}
): string {
  const url = new URL(`${TFL_API_BASE_URL}${endpoint}`);
  
  // Add API key if available
  const apiKey = getApiKey();
  if (apiKey) {
    url.searchParams.set('app_key', apiKey);
  }
  
  // Add other parameters
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  
  return url.toString();
}

/**
 * Make a request to the TfL API
 */
async function tflFetch<T>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: { revalidate?: number } = {}
): Promise<ApiResponse<T>> {
  try {
    const url = buildUrl(endpoint, params);
    
    console.log(`[TfL API] Fetching: ${endpoint}`);
    
    const response = await fetch(url, {
      next: options.revalidate ? { revalidate: options.revalidate } : undefined,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Provide helpful error messages for common issues
      let errorMessage = `TfL API error: ${response.status} ${response.statusText}`;
      
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'TfL API authentication failed. Please check your API key.';
      } else if (response.status === 429) {
        errorMessage = 'TfL API rate limit exceeded. Please try again later.';
      } else if (response.status === 404) {
        errorMessage = 'Resource not found on TfL API.';
      } else if (response.status >= 500) {
        errorMessage = 'TfL API is temporarily unavailable. Please try again later.';
      }
      
      console.error(`[TfL API] Error ${response.status}:`, errorText);
      
      return {
        success: false,
        error: errorMessage,
        details: errorText,
        statusCode: response.status,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data as T,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[TfL API] Network error:', error);
    
    // Check for network-related errors
    const errorMessage = error instanceof Error 
      ? error.message.includes('fetch') 
        ? 'Unable to connect to TfL API. Please check your internet connection.'
        : error.message
      : 'Unknown error occurred';
    
    return {
      success: false,
      error: errorMessage,
      details: error,
    };
  }
}

// ============================================================================
// Stop Search
// ============================================================================

export interface SearchStopsOptions {
  /** Search query (stop name or code) */
  query: string;
  /** Transport modes to filter by (comma-separated or array) */
  modes?: string | string[];
  /** Maximum number of results */
  maxResults?: number;
}

/**
 * Search for stops by name or code
 * @param options Search options
 * @returns Search results from TfL API
 */
export async function searchStops(
  options: SearchStopsOptions
): Promise<ApiResponse<TflSearchResponse>> {
  const { query, modes = 'bus', maxResults } = options;
  
  const modesStr = Array.isArray(modes) ? modes.join(',') : modes;
  
  return tflFetch<TflSearchResponse>(
    '/StopPoint/Search',
    {
      query,
      modes: modesStr,
      maxResults,
    },
    { revalidate: 300 } // Cache for 5 minutes
  );
}

// ============================================================================
// Stop Details
// ============================================================================

export interface GetStopDetailsOptions {
  /** Stop ID (NaPTAN ID) */
  stopId: string;
  /** Whether to include child stops */
  includeCrowding?: boolean;
}

/**
 * Get detailed information about a stop including children
 * @param options Options for fetching stop details
 * @returns Stop details from TfL API
 */
export async function getStopDetails(
  options: GetStopDetailsOptions
): Promise<ApiResponse<TflStopPoint>> {
  const { stopId, includeCrowding } = options;
  
  return tflFetch<TflStopPoint>(
    `/StopPoint/${encodeURIComponent(stopId)}`,
    {
      includeCrowdingData: includeCrowding,
    },
    { revalidate: 3600 } // Cache for 1 hour
  );
}

/**
 * Get child stops for a group stop
 * @param stopId Parent stop ID
 * @returns Array of child stop points
 */
export async function getChildStops(
  stopId: string
): Promise<ApiResponse<TflStopPoint[]>> {
  const result = await getStopDetails({ stopId });
  
  if (!result.success) {
    return result;
  }
  
  const children = result.data.children || [];
  return {
    success: true,
    data: children,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Arrivals
// ============================================================================

export interface GetArrivalsOptions {
  /** Stop ID (NaPTAN ID) */
  stopId: string;
  /** Filter by specific line IDs */
  lineIds?: string[];
  /** Direction filter */
  direction?: 'inbound' | 'outbound' | 'all';
  /** Destination NaPTAN ID filter */
  destinationStopId?: string;
}

/**
 * Get real-time arrivals for a stop
 * @param options Options for fetching arrivals
 * @returns Array of arrivals sorted by time to station
 */
export async function getArrivals(
  options: GetArrivalsOptions
): Promise<ApiResponse<TflArrival[]>> {
  const { stopId, lineIds, direction, destinationStopId } = options;
  
  let endpoint = `/StopPoint/${encodeURIComponent(stopId)}/Arrivals`;
  
  // If filtering by line IDs, use line-specific endpoint
  if (lineIds && lineIds.length > 0) {
    const lineIdsStr = lineIds.join(',');
    endpoint = `/Line/${lineIdsStr}/Arrivals/${encodeURIComponent(stopId)}`;
  }
  
  const result = await tflFetch<TflArrival[]>(
    endpoint,
    {
      direction,
      destinationStopId,
    },
    { revalidate: 15 } // Cache for 15 seconds
  );
  
  if (!result.success) {
    return result;
  }
  
  // Sort by time to station
  const sortedArrivals = result.data.sort((a, b) => a.timeToStation - b.timeToStation);
  
  return {
    success: true,
    data: sortedArrivals,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Line Status
// ============================================================================

export interface GetLineStatusOptions {
  /** Line ID(s) to check */
  lineIds: string | string[];
  /** Whether to include details */
  detail?: boolean;
}

/**
 * Get current status for one or more lines
 * @param options Options for fetching line status
 * @returns Array of line status information
 */
export async function getLineStatus(
  options: GetLineStatusOptions
): Promise<ApiResponse<TflLineStatus[]>> {
  const { lineIds, detail } = options;
  
  const lineIdsStr = Array.isArray(lineIds) ? lineIds.join(',') : lineIds;
  
  return tflFetch<TflLineStatus[]>(
    `/Line/${lineIdsStr}/Status`,
    {
      detail,
    },
    { revalidate: 60 } // Cache for 1 minute
  );
}

/**
 * Get status for all lines of a specific mode
 * @param mode Transport mode (e.g., 'bus', 'tube')
 * @returns Array of line status information
 */
export async function getLineStatusByMode(
  mode: string
): Promise<ApiResponse<TflLineStatus[]>> {
  return tflFetch<TflLineStatus[]>(
    `/Line/Mode/${mode}/Status`,
    {},
    { revalidate: 60 } // Cache for 1 minute
  );
}

// ============================================================================
// Nearby Stops
// ============================================================================

export interface GetNearbyStopsOptions {
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
  /** Radius in meters (default: 500) */
  radius?: number;
  /** Stop types to include */
  stopTypes?: string[];
  /** Transport modes to filter by */
  modes?: string[];
}

/** TfL nearby stops response structure */
interface TflStopPointsResponse {
  stopPoints: TflStopPoint[];
  centrePoint?: [number, number];
}

/**
 * Get stops near a location
 * @param options Options for fetching nearby stops
 * @returns Array of nearby stops
 */
export async function getNearbyStops(
  options: GetNearbyStopsOptions
): Promise<ApiResponse<TflStopPoint[]>> {
  const {
    lat,
    lon,
    radius = 500,
    stopTypes = ['NaptanPublicBusCoachTram'],
    modes = ['bus']
  } = options;

  const result = await tflFetch<TflStopPointsResponse>(
    '/StopPoint',
    {
      lat,
      lon,
      radius,
      stopTypes: stopTypes.join(','),
      modes: modes.join(','),
    },
    { revalidate: 60 } // Cache for 1 minute
  );

  if (!result.success) {
    return result;
  }

  // TfL API returns { stopPoints: [...] } not a direct array
  return {
    success: true,
    data: result.data.stopPoints || [],
    timestamp: result.timestamp,
  };
}

// ============================================================================
// Data Transformation Helpers
// ============================================================================

/**
 * Transform TfL stop point to application Stop type
 */
export function transformToStop(tflStop: TflStopPoint): Stop {
  return {
    id: tflStop.id,
    naptanId: tflStop.naptanId,
    name: tflStop.commonName,
    stopLetter: tflStop.stopLetter,
    direction: tflStop.indicator,
    lat: tflStop.lat,
    lon: tflStop.lon,
    modes: tflStop.modes,
    lines: tflStop.lines?.map((line) => line.id) || [],
    isGroup: Boolean(tflStop.children && tflStop.children.length > 0),
    childCount: tflStop.children?.length,
  };
}

/**
 * Transform TfL arrival to application Arrival type
 */
export function transformToArrival(tflArrival: TflArrival): Arrival {
  return {
    id: tflArrival.id,
    lineName: tflArrival.lineName,
    destination: tflArrival.destinationName,
    timeToStation: tflArrival.timeToStation,
    expectedArrival: new Date(tflArrival.expectedArrival),
    platform: tflArrival.platformName,
    towards: tflArrival.towards,
    vehicleId: tflArrival.vehicleId,
    currentLocation: tflArrival.currentLocation,
    mode: tflArrival.modeName,
  };
}

/**
 * Transform array of TfL arrivals to application Arrival types
 */
export function transformArrivals(tflArrivals: TflArrival[]): Arrival[] {
  return tflArrivals.map(transformToArrival);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a stop ID represents a group stop (contains multiple child stops)
 * Group stops typically have IDs starting with "490G"
 */
export function isGroupStopId(stopId: string): boolean {
  return stopId.startsWith('490G');
}

/**
 * Format time to station in human-readable format
 * @param seconds Seconds until arrival
 * @returns Formatted string (e.g., "3 min", "Due")
 */
export function formatTimeToStation(seconds: number): string {
  if (seconds < 60) {
    return 'Due';
  }
  
  const minutes = Math.floor(seconds / 60);
  
  if (minutes === 1) {
    return '1 min';
  }
  
  return `${minutes} min`;
}

/**
 * Extract stop letter from indicator string if not directly available
 * @param indicator Indicator string (e.g., "Stop C", "towards Town Centre")
 * @returns Stop letter or undefined
 */
export function extractStopLetter(indicator?: string): string | undefined {
  if (!indicator) return undefined;
  
  const match = indicator.match(/^Stop\s+([A-Z])$/i);
  return match ? match[1].toUpperCase() : undefined;
}

// ============================================================================
// Export TfL Client Object
// ============================================================================

export const tflClient = {
  searchStops,
  getStopDetails,
  getChildStops,
  getArrivals,
  getNearbyStops,
  getLineStatus,
  getLineStatusByMode,
  transformToStop,
  transformToArrival,
  transformArrivals,
  isGroupStopId,
  formatTimeToStation,
  extractStopLetter,
};

export default tflClient;

