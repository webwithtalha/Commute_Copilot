/**
 * GTFS-RT Client for UK-wide Real-time Bus Data
 *
 * Fetches real-time vehicle positions from BODS (Bus Open Data Service) GTFS-RT feed
 * and estimates arrivals based on vehicle proximity and heading.
 *
 * Note: BODS provides vehicle positions, not arrival predictions.
 * We estimate arrivals using distance and average bus speed.
 */

import type { Arrival, Stop, ApiResponse } from '@/types/tfl';

// ============================================================================
// Configuration
// ============================================================================

const BODS_GTFSRT_URL = 'https://data.bus-data.dft.gov.uk/api/v1/gtfsrtdatafeed/';

// Average bus speed in km/h for arrival estimation
const AVERAGE_BUS_SPEED_KMH = 20;

// Maximum distance to search for approaching buses (in km)
// Larger radius helps catch buses in rural/suburban areas
const MAX_SEARCH_RADIUS_KM = 10;

// Maximum number of arrivals to return
const MAX_ARRIVALS = 10;

// ============================================================================
// Types
// ============================================================================

interface GtfsRtFeed {
  header: {
    gtfsRealtimeVersion: string;
    timestamp: { low: number; high: number; unsigned: boolean };
  };
  entity: GtfsRtEntity[];
}

interface GtfsRtEntity {
  id: string;
  vehicle?: GtfsRtVehicle;
  tripUpdate?: GtfsRtTripUpdate;
}

interface GtfsRtVehicle {
  trip?: {
    tripId?: string;
    routeId?: string;
    startTime?: string;
    startDate?: string;
  };
  position?: {
    latitude: number;
    longitude: number;
    bearing?: number;
  };
  currentStopSequence?: number;
  stopId?: string;
  timestamp?: { low: number; high: number; unsigned: boolean };
  vehicle?: {
    id?: string;
    label?: string;
  };
}

interface GtfsRtTripUpdate {
  trip?: {
    tripId?: string;
    routeId?: string;
  };
  stopTimeUpdate?: Array<{
    stopSequence?: number;
    stopId?: string;
    arrival?: {
      delay?: number;
      time?: { low: number };
    };
    departure?: {
      delay?: number;
      time?: { low: number };
    };
  }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate bearing from point 1 to point 2
 * Returns bearing in degrees (0-360)
 */
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  let bearing = Math.atan2(y, x) * (180 / Math.PI);
  bearing = (bearing + 360) % 360;
  return bearing;
}

/**
 * Check if a vehicle is heading towards the stop
 * Compares the vehicle's bearing with the bearing to the stop
 */
function isHeadingTowardsStop(
  vehicleBearing: number | undefined,
  bearingToStop: number,
  tolerance: number = 60
): boolean {
  // Require valid bearing to confirm vehicle is moving towards stop
  if (vehicleBearing === undefined || vehicleBearing === null) return false;

  let diff = Math.abs(vehicleBearing - bearingToStop);
  if (diff > 180) diff = 360 - diff;

  return diff <= tolerance;
}

/**
 * Estimate arrival time based on distance and average speed
 */
function estimateArrivalSeconds(distanceKm: number): number {
  // Time = Distance / Speed
  // Convert to seconds
  return Math.round((distanceKm / AVERAGE_BUS_SPEED_KMH) * 3600);
}

/**
 * Extract route number from route ID or trip ID
 * BODS route IDs are often internal IDs, try to extract meaningful info
 */
function extractLineName(routeId?: string, tripId?: string): string {
  // Try to find a short number/name pattern in the IDs
  // This is a heuristic - actual line names would need GTFS static data

  if (routeId) {
    // Check if routeId is already a line number
    if (/^\d{1,3}[A-Z]?$/.test(routeId)) {
      return routeId;
    }
    // Try to extract from common patterns
    const match = routeId.match(/[_-]?(\d{1,3}[A-Z]?)[_-]?/);
    if (match) return match[1];
  }

  // Fall back to showing a shortened ID
  return routeId?.slice(-4) || tripId?.slice(-4) || '?';
}

// ============================================================================
// GTFS-RT API Client
// ============================================================================

/**
 * Get the BODS API key from environment variables
 */
function getApiKey(): string | null {
  const apiKey = process.env.BODS_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.warn('[GTFS-RT] BODS_API_KEY not set');
    return null;
  }
  return apiKey;
}

/**
 * Create a bounding box string for BODS API
 * Format: minLon,minLat,maxLon,maxLat
 * @param lat Center latitude
 * @param lon Center longitude
 * @param radiusKm Radius in kilometers (default ~10km)
 */
function createBoundingBox(lat: number, lon: number, radiusKm: number = 10): string {
  // 1 degree latitude ≈ 111km
  // 1 degree longitude varies with latitude, ≈ 111km * cos(lat)
  const latOffset = radiusKm / 111;
  const lonOffset = radiusKm / (111 * Math.cos(toRad(lat)));

  const minLon = (lon - lonOffset).toFixed(4);
  const minLat = (lat - latOffset).toFixed(4);
  const maxLon = (lon + lonOffset).toFixed(4);
  const maxLat = (lat + latOffset).toFixed(4);

  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

/**
 * Fetch vehicles from BODS GTFS-RT feed using bounding box
 * This approach works for any UK location without needing to know specific operators
 */
async function fetchVehiclesNearStop(
  stopLat: number,
  stopLon: number
): Promise<GtfsRtEntity[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('BODS API key not configured');
  }

  // Use bounding box to get all vehicles in the area (works for any UK location)
  const boundingBox = createBoundingBox(stopLat, stopLon, MAX_SEARCH_RADIUS_KM);

  console.log(`[GTFS-RT] Fetching vehicles in bounding box: ${boundingBox}`);

  try {
    const url = `${BODS_GTFSRT_URL}?api_key=${apiKey}&boundingBox=${boundingBox}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000), // 20 second timeout for larger area
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GTFS-RT] BODS API error ${response.status}:`, errorText);

      if (response.status === 401 || response.status === 403) {
        throw new Error('BODS API authentication failed');
      }
      throw new Error(`BODS API error: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    // Check if response is valid protobuf (not HTML error page)
    const firstBytes = new Uint8Array(buffer.slice(0, 20));
    if (firstBytes[0] === 0x3c) { // '<' character - likely HTML
      console.warn('[GTFS-RT] Received HTML instead of protobuf - API may be unavailable');
      return [];
    }

    // Check for empty response
    if (buffer.byteLength === 0) {
      console.log('[GTFS-RT] Empty response from BODS API');
      return [];
    }

    const GtfsRealtimeBindings = await import('gtfs-realtime-bindings');
    const feed = GtfsRealtimeBindings.default.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    console.log(`[GTFS-RT] Received ${feed.entity.length} vehicles from BODS`);

    // Filter to only vehicles with position data near the stop
    const nearbyEntities = (feed.entity as GtfsRtEntity[]).filter(entity => {
      const pos = entity.vehicle?.position;
      if (!pos) return false;

      const distance = haversineDistance(pos.latitude, pos.longitude, stopLat, stopLon);
      return distance <= MAX_SEARCH_RADIUS_KM;
    });

    console.log(`[GTFS-RT] Found ${nearbyEntities.length} vehicles within ${MAX_SEARCH_RADIUS_KM}km of stop`);

    return nearbyEntities;
  } catch (error) {
    console.error('[GTFS-RT] Error fetching vehicles:', error);
    throw error;
  }
}

/**
 * Convert vehicle positions to arrival estimates for a stop
 */
function estimateArrivalsFromVehicles(
  vehicles: GtfsRtEntity[],
  stop: Stop
): Arrival[] {
  const arrivals: Arrival[] = [];
  const now = new Date();
  const MIN_DISTANCE_KM = 0.05; // 50m - filter out likely parked/stationary vehicles
  const MAX_DATA_AGE_SECONDS = 300; // 5 minutes - reject stale vehicle data

  for (const entity of vehicles) {
    const vehicle = entity.vehicle;
    if (!vehicle?.position) continue;

    // Check data freshness - timestamp indicates when vehicle last reported
    if (vehicle.timestamp?.low) {
      const reportedAt = new Date(vehicle.timestamp.low * 1000);
      const dataAgeSeconds = (now.getTime() - reportedAt.getTime()) / 1000;

      // Skip stale data (vehicle hasn't reported recently - likely not in service)
      if (dataAgeSeconds > MAX_DATA_AGE_SECONDS) {
        continue;
      }
    }

    const { latitude, longitude, bearing } = vehicle.position;

    // Require valid bearing data to ensure vehicle is actually moving
    if (bearing === undefined || bearing === null) continue;

    // Calculate distance to stop
    const distanceKm = haversineDistance(latitude, longitude, stop.lat, stop.lon);

    // Skip if too far
    if (distanceKm > MAX_SEARCH_RADIUS_KM) continue;

    // Skip if too close (likely parked at/near the stop)
    if (distanceKm < MIN_DISTANCE_KM) continue;

    // Calculate bearing from vehicle to stop
    const bearingToStop = calculateBearing(latitude, longitude, stop.lat, stop.lon);

    // Check if vehicle is heading towards the stop (no longer allow missing bearing)
    if (!isHeadingTowardsStop(bearing, bearingToStop)) continue;

    // Estimate arrival time
    const timeToStationSeconds = estimateArrivalSeconds(distanceKm);

    // Skip if estimated arrival is too long (more than 30 mins)
    if (timeToStationSeconds > 1800) continue;

    const expectedArrival = new Date(now.getTime() + timeToStationSeconds * 1000);

    // Extract info
    const lineName = extractLineName(vehicle.trip?.routeId, vehicle.trip?.tripId);
    const vehicleId = entity.id || vehicle.vehicle?.id || `v-${Date.now()}`;

    arrivals.push({
      id: `${vehicleId}-${stop.id}`,
      lineName,
      destination: 'Via this stop', // We don't have destination info
      timeToStation: timeToStationSeconds,
      expectedArrival,
      vehicleId,
      currentLocation: `${distanceKm.toFixed(1)}km away`,
      towards: vehicle.trip?.routeId ? `Route ${vehicle.trip.routeId.slice(-6)}` : undefined,
      mode: 'bus',
    });
  }

  // Sort by arrival time and limit
  return arrivals
    .sort((a, b) => a.timeToStation - b.timeToStation)
    .slice(0, MAX_ARRIVALS);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get estimated arrivals for a stop based on nearby vehicle positions
 */
export async function getArrivalsForStop(stop: Stop): Promise<ApiResponse<Arrival[]>> {
  console.log(`[GTFS-RT] Getting arrivals for stop: ${stop.id} (${stop.name})`);

  // Skip if stop doesn't have valid coordinates
  if (!stop.lat || !stop.lon || (stop.lat === 0 && stop.lon === 0)) {
    console.warn('[GTFS-RT] Stop has no valid coordinates');
    return {
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    };
  }

  try {
    // Fetch vehicles near the stop
    const vehicles = await fetchVehiclesNearStop(stop.lat, stop.lon);

    if (vehicles.length === 0) {
      console.log('[GTFS-RT] No vehicles found in area');
      return {
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }

    // Estimate arrivals
    const arrivals = estimateArrivalsFromVehicles(vehicles, stop);

    console.log(`[GTFS-RT] Estimated ${arrivals.length} arrivals`);

    return {
      success: true,
      data: arrivals,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[GTFS-RT] Error:', error);

    // Return empty array on error to avoid breaking the UI
    return {
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    };
  }
}

export const gtfsrtClient = {
  getArrivalsForStop,
};

export default gtfsrtClient;
