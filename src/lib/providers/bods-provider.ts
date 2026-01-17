/**
 * BODS Transit Provider
 * 
 * Implements the TransitProvider interface using the UK Bus Open Data Service (BODS) API.
 * Provides bus data for cities outside London across the UK.
 * 
 * API Documentation: https://data.bus-data.dft.gov.uk/guidance/requirements/
 * 
 * Key Endpoints:
 * - SIRI-VM: Real-time vehicle locations and arrival predictions
 * - Timetables: Scheduled service data (TransXChange format)
 * 
 * Note: Stop data is sourced from NaPTAN (National Public Transport Access Nodes)
 * which uses ATCO codes as identifiers, compatible with TfL's NaPTAN IDs.
 */

import type { Stop, Arrival, ApiResponse } from '@/types/tfl';
import type {
  TransitProvider,
  SearchStopsOptions,
  GetStopDetailsOptions,
  GetArrivalsOptions,
  GetNearbyStopsOptions
} from './index';
import type { BodsCityConfig } from '@/config/cities';
import { CITIES, isBodsCityConfig, getCityOrDefault } from '@/config/cities';
import { naptanClient } from '@/lib/naptan-client';
import { gtfsrtClient } from '@/lib/gtfsrt-client';

// ============================================================================
// BODS API Configuration
// ============================================================================

const BODS_API_BASE_URL = 'https://data.bus-data.dft.gov.uk/api/v1';

// NaPTAN data is sourced from OpenStreetMap via Overpass API
// This provides UK-wide bus stop coverage without requiring additional API keys

// ============================================================================
// BODS API Response Types
// ============================================================================

/** SIRI-VM Service Delivery Response */
interface SiriVmResponse {
  Siri: {
    ServiceDelivery: {
      ResponseTimestamp: string;
      ProducerRef: string;
      VehicleMonitoringDelivery: VehicleMonitoringDelivery[];
    };
  };
}

interface VehicleMonitoringDelivery {
  ResponseTimestamp: string;
  ValidUntil: string;
  VehicleActivity: VehicleActivity[];
}

interface VehicleActivity {
  RecordedAtTime: string;
  ValidUntilTime: string;
  MonitoredVehicleJourney: MonitoredVehicleJourney;
}

interface MonitoredVehicleJourney {
  LineRef: string;
  DirectionRef: string;
  FramedVehicleJourneyRef?: {
    DataFrameRef: string;
    DatedVehicleJourneyRef: string;
  };
  PublishedLineName: string;
  OperatorRef: string;
  OriginRef?: string;
  OriginName?: string;
  DestinationRef?: string;
  DestinationName: string;
  OriginAimedDepartureTime?: string;
  VehicleLocation?: {
    Longitude: number;
    Latitude: number;
  };
  Bearing?: number;
  BlockRef?: string;
  VehicleRef: string;
  MonitoredCall?: MonitoredCall;
  OnwardCalls?: {
    OnwardCall: OnwardCall[];
  };
}

interface MonitoredCall {
  StopPointRef: string;
  Order: number;
  StopPointName?: string;
  VehicleAtStop?: boolean;
  DestinationDisplay?: string;
  AimedArrivalTime?: string;
  ExpectedArrivalTime?: string;
  AimedDepartureTime?: string;
  ExpectedDepartureTime?: string;
}

interface OnwardCall {
  StopPointRef: string;
  Order: number;
  StopPointName?: string;
  AimedArrivalTime?: string;
  ExpectedArrivalTime?: string;
  AimedDepartureTime?: string;
  ExpectedDepartureTime?: string;
}

/** NaPTAN Stop Response Types */
interface NaptanStop {
  AtcoCode: string;
  NaptanCode?: string;
  CommonName: string;
  ShortCommonName?: string;
  Landmark?: string;
  Street?: string;
  Indicator?: string;
  Bearing?: string;
  LocalityName?: string;
  ParentLocalityName?: string;
  NptgLocalityCode?: string;
  Longitude: number;
  Latitude: number;
  StopType: string;
  BusStopType?: string;
  Status?: string;
  AdministrativeAreaCode?: string;
}

interface NaptanSearchResponse {
  Stops: NaptanStop[];
  page?: number;
  total?: number;
}

// ============================================================================
// BODS Provider Implementation
// ============================================================================

/**
 * Get the BODS API key from environment variables
 * BODS requires an API key for all requests
 */
function getApiKey(): string | null {
  const apiKey = process.env.BODS_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.warn(
      '⚠️  BODS_API_KEY not set. BODS features will not work.\n' +
      '   To get an API key:\n' +
      '   1. Go to https://data.bus-data.dft.gov.uk/account/signup/\n' +
      '   2. Create an account\n' +
      '   3. Copy your API key from your account settings\n' +
      '   4. Add BODS_API_KEY=your_key_here to your .env.local file\n'
    );
    return null;
  }
  return apiKey;
}

/**
 * BODS Provider class implementing the TransitProvider interface.
 * Uses the UK Bus Open Data Service API for UK-wide bus data.
 */
export class BodsProvider implements TransitProvider {
  readonly providerId = 'bods';
  readonly providerName = 'UK Bus Open Data Service';

  // ============================================================================
  // Public Interface Methods
  // ============================================================================

  /**
   * Search for stops using OpenStreetMap/Overpass API
   *
   * Uses the NaPTAN client which queries OpenStreetMap for UK-wide bus stop data.
   * This provides coverage for stops outside London where TfL data is not available.
   */
  async searchStops(options: SearchStopsOptions): Promise<ApiResponse<Stop[]>> {
    const { query, maxResults = 20 } = options;

    console.log(`[BODS] Searching for stops: "${query}" (maxResults: ${maxResults})`);

    const trimmedQuery = query.trim();

    // Check if query is a 5-digit stop code
    const isStopCode = /^\d{5}$/.test(trimmedQuery);

    if (isStopCode) {
      // Try to find stop by code
      return await this.searchStopByCode(trimmedQuery);
    }

    // For name-based search, use NaPTAN/OSM client for UK-wide coverage
    const searchResult = await naptanClient.searchStopsByName(trimmedQuery, maxResults);

    if (!searchResult.success) {
      console.warn(`[BODS] Stop search failed: ${searchResult.error}`);
      // Return empty results instead of error to prevent UI disruption
      return {
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }

    if (searchResult.data.length > 0) {
      console.log(`[BODS] Found ${searchResult.data.length} stops via NaPTAN/OSM`);
      return {
        success: true,
        data: searchResult.data.slice(0, maxResults),
        timestamp: new Date().toISOString(),
      };
    }

    // No results found
    console.log(`[BODS] No stops found for "${trimmedQuery}"`);

    return {
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Search for a stop by 5-digit stop code
   */
  private async searchStopByCode(stopCode: string): Promise<ApiResponse<Stop[]>> {
    console.log(`[BODS] Searching for stop code: ${stopCode}`);

    // Use NaPTAN/OSM client to find stop by code
    const result = await naptanClient.getStopByStopCode(stopCode);

    if (!result.success) {
      console.warn(`[BODS] Stop code search failed: ${result.error}`);
      return {
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }

    if (result.data) {
      return {
        success: true,
        data: [result.data],
        timestamp: new Date().toISOString(),
      };
    }

    // If not found, return empty results
    return {
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    };
  }


  /**
   * Get stop details using NaPTAN/OSM API
   */
  async getStopDetails(options: GetStopDetailsOptions): Promise<ApiResponse<Stop>> {
    const { stopId } = options;

    console.log(`[BODS] Getting stop details for: ${stopId}`);

    // Use NaPTAN client to get stop details
    const result = await naptanClient.getStopDetails(stopId);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to get stop details',
      };
    }

    if (!result.data) {
      // Stop not found in OSM - return a basic placeholder
      console.warn(`[BODS] Stop ${stopId} not found in OSM. Using placeholder.`);
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

    return {
      success: true,
      data: result.data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get real-time arrivals for outside London stops
   *
   * Primary: Uses BODS SIRI-VM API for actual arrival predictions with destinations.
   */
  async getArrivals(options: GetArrivalsOptions): Promise<ApiResponse<Arrival[]>> {
    const { stopId } = options;

    console.log(`[BODS] Arrivals requested for stop: ${stopId}`);

    // First, get the stop details to get coordinates and alternative IDs
    const stopResult = await this.getStopDetails({ stopId });

    if (!stopResult.success || !stopResult.data) {
      console.warn(`[BODS] Could not get stop details for arrivals`);
      return {
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }

    const stop = stopResult.data;

    // Skip if stop doesn't have valid coordinates
    if (!stop.lat || !stop.lon || (stop.lat === 0 && stop.lon === 0)) {
      console.warn(`[BODS] Stop ${stopId} has no valid coordinates`);
      return {
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }

    // Collect all possible stop ID formats for matching
    // BODS may use different formats: NaPTAN code (sufajwgw), ATCO code (390GSUFAJWGW), etc.
    const stopIds: string[] = [stopId];
    if (stop.stopCode && stop.stopCode !== stopId) {
      stopIds.push(stop.stopCode); // e.g., "sufajwgw"
    }
    if (stop.naptanId && stop.naptanId !== stopId) {
      stopIds.push(stop.naptanId);
    }

    console.log(`[BODS] Will try matching against stop IDs: ${stopIds.join(', ')}`);

    // Use SIRI-VM for actual arrival predictions
    // This is the only reliable method as it verifies which stops a bus will visit
    const siriVmResult = await this.getSiriVmArrivals(stopIds, stop.lat, stop.lon);

    if (siriVmResult.success && siriVmResult.data && siriVmResult.data.length > 0) {
      console.log(`[BODS] Got ${siriVmResult.data.length} arrivals from SIRI-VM`);
      return siriVmResult;
    }

    // Log why we have no arrivals
    if (!siriVmResult.success) {
      console.warn(`[BODS] SIRI-VM failed: ${siriVmResult.error}`);
    } else {
      console.log(`[BODS] SIRI-VM returned no arrivals for stop ${stopId}`);
      console.log(`[BODS] This may mean no buses are currently heading to this stop`);
    }

    // Note: We don't use GTFS-RT fallback because it cannot verify which stops a bus serves
    // It would show incorrect arrivals (any bus heading in the general direction)

    return {
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get nearby stops using NaPTAN/OSM data
   */
  async getNearbyStops(options: GetNearbyStopsOptions): Promise<ApiResponse<Stop[]>> {
    const { lat, lon, radius = 500, maxResults = 20 } = options;

    console.log(`[BODS] Fetching nearby stops at (${lat}, ${lon}) within ${radius}m`);

    const result = await naptanClient.searchStopsByLocation(lat, lon, radius);

    if (!result.success) {
      console.warn(`[BODS] Nearby stops search failed: ${result.error}`);
      return {
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }

    // Limit results
    const stops = result.data.slice(0, maxResults);

    console.log(`[BODS] Found ${stops.length} nearby stops`);

    return {
      success: true,
      data: stops,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // SIRI-VM API Methods (Real-time Arrivals)
  // ============================================================================

  /**
   * Get real-time arrivals from BODS SIRI-VM feed
   * Uses bounding box around stop coordinates to fetch nearby vehicles,
   * then filters for vehicles heading to the target stop.
   *
   * @param stopIds Array of possible stop ID formats to match against
   * @param stopLat Stop latitude
   * @param stopLon Stop longitude
   */
  private async getSiriVmArrivals(
    stopIds: string[],
    stopLat: number,
    stopLon: number
  ): Promise<ApiResponse<Arrival[]>> {
    const apiKey = getApiKey();

    if (!apiKey) {
      return {
        success: false,
        error: 'BODS API key not configured',
        statusCode: 401,
      };
    }

    try {
      // Build SIRI-VM request URL
      // BODS SIRI-VM endpoint: /datafeed/ with bounding box
      const url = new URL(`${BODS_API_BASE_URL}/datafeed/`);
      url.searchParams.set('api_key', apiKey);

      // Create a bounding box around the stop (approx 10km radius)
      // 0.1 degrees ≈ 11km at UK latitudes - larger box catches more buses
      // especially in rural areas where services are more spread out
      const boxSize = 0.1;
      const boundingBox = [
        (stopLon - boxSize).toFixed(4),  // min longitude (west)
        (stopLat - boxSize).toFixed(4),  // min latitude (south)
        (stopLon + boxSize).toFixed(4),  // max longitude (east)
        (stopLat + boxSize).toFixed(4),  // max latitude (north)
      ].join(',');

      url.searchParams.set('boundingBox', boundingBox);

      console.log(`[BODS/SIRI-VM] Fetching arrivals for stops: ${stopIds.join(', ')} (bbox: ${boundingBox})`);

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        let errorMessage = `BODS SIRI-VM error: ${response.status}`;
        
        if (response.status === 401 || response.status === 403) {
          errorMessage = 'BODS API authentication failed. Please check your API key.';
        } else if (response.status === 429) {
          errorMessage = 'BODS API rate limit exceeded. Please try again later.';
        }
        
        console.error(`[BODS/SIRI-VM] Error ${response.status}:`, errorText);
        
        return {
          success: false,
          error: errorMessage,
          statusCode: response.status,
        };
      }

      // Parse XML response and extract arrivals for this specific stop
      const xmlText = await response.text();

      // Log raw vehicle count for debugging
      const vehicleCount = (xmlText.match(/<VehicleActivity>/g) || []).length;
      console.log(`[BODS/SIRI-VM] Response contains ${vehicleCount} vehicles in area`);

      const arrivals = this.parseSiriVmResponse(xmlText, stopIds, stopLat, stopLon);

      console.log(`[BODS/SIRI-VM] Found ${arrivals.length} buses actually serving stop(s): ${stopIds.join(', ')}`);

      return {
        success: true,
        data: arrivals,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[BODS/SIRI-VM] Error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch arrivals',
      };
    }
  }

  /**
   * Parse SIRI-VM XML response and extract arrivals for the target stop
   *
   * IMPORTANT: Only shows buses that will actually visit the target stop.
   * Checks MonitoredCall and OnwardCalls to verify the stop is on the route.
   *
   * @param xml SIRI-VM XML response
   * @param targetStopIds Array of possible stop ID formats to match against
   * @param stopLat Stop latitude for distance estimation fallback
   * @param stopLon Stop longitude for distance estimation fallback
   */
  private parseSiriVmResponse(
    xml: string,
    targetStopIds: string[],
    stopLat: number,
    stopLon: number
  ): Arrival[] {
    const arrivals: Arrival[] = [];
    const MAX_DATA_AGE_SECONDS = 300; // 5 minutes - reject stale vehicle data
    const now = new Date();

    // Normalize all target stop IDs for matching (remove spaces, uppercase)
    const normalizedTargetIds = targetStopIds.map(id => id.replace(/\s/g, '').toUpperCase());

    // Track stats for debugging
    let vehiclesWithMonitoredCall = 0;
    let vehiclesWithOnwardCalls = 0;
    let stopsChecked = new Set<string>();

    try {
      // Extract VehicleActivity elements using regex (lightweight XML parsing)
      const vehicleActivityRegex = /<VehicleActivity>([\s\S]*?)<\/VehicleActivity>/g;
      let match;

      while ((match = vehicleActivityRegex.exec(xml)) !== null) {
        const vehicleActivity = match[1];

        // Check data freshness - RecordedAtTime indicates when the vehicle last reported
        const recordedAtTimeStr = this.extractXmlValue(vehicleActivity, 'RecordedAtTime');
        if (recordedAtTimeStr) {
          const recordedAt = new Date(recordedAtTimeStr);
          const dataAgeSeconds = (now.getTime() - recordedAt.getTime()) / 1000;

          // Skip stale data (vehicle hasn't reported recently - likely not in service)
          if (dataAgeSeconds > MAX_DATA_AGE_SECONDS) {
            continue;
          }
        }

        // Track stats for debugging
        if (vehicleActivity.includes('<MonitoredCall>')) vehiclesWithMonitoredCall++;
        if (vehicleActivity.includes('<OnwardCalls>')) vehiclesWithOnwardCalls++;

        // Check if this bus will visit our target stop
        // Look in MonitoredCall (next stop) and OnwardCalls (subsequent stops)
        const stopMatch = this.findStopInJourney(vehicleActivity, normalizedTargetIds, stopsChecked);

        if (!stopMatch) {
          // Bus doesn't serve this stop - skip it
          continue;
        }

        // Extract journey details
        const lineName = this.extractXmlValue(vehicleActivity, 'PublishedLineName') ||
                        this.extractXmlValue(vehicleActivity, 'LineRef') || '?';
        const destinationName = this.extractXmlValue(vehicleActivity, 'DestinationName') || 'Unknown destination';
        const vehicleRef = this.extractXmlValue(vehicleActivity, 'VehicleRef') || `v-${Date.now()}`;

        // Calculate arrival time
        let timeToStationSeconds: number;
        let expectedArrival: Date;
        let currentLocation: string;

        if (stopMatch.expectedArrivalTime) {
          // Use the actual expected arrival time from the feed
          expectedArrival = new Date(stopMatch.expectedArrivalTime);
          timeToStationSeconds = Math.max(0, Math.round((expectedArrival.getTime() - now.getTime()) / 1000));
          currentLocation = stopMatch.stopsAway ? `${stopMatch.stopsAway} stops away` : 'On route';
        } else if (stopMatch.aimedArrivalTime) {
          // Fall back to scheduled time
          expectedArrival = new Date(stopMatch.aimedArrivalTime);
          timeToStationSeconds = Math.max(0, Math.round((expectedArrival.getTime() - now.getTime()) / 1000));
          currentLocation = 'Scheduled';
        } else {
          // No arrival time available - estimate from vehicle position
          const vehicleLat = parseFloat(this.extractXmlValue(vehicleActivity, 'Latitude') || '0');
          const vehicleLon = parseFloat(this.extractXmlValue(vehicleActivity, 'Longitude') || '0');

          if (!vehicleLat || !vehicleLon) continue;

          const distanceKm = this.haversineDistance(vehicleLat, vehicleLon, stopLat, stopLon);
          const AVERAGE_BUS_SPEED_KMH = 15; // Conservative estimate for urban areas
          timeToStationSeconds = Math.round((distanceKm / AVERAGE_BUS_SPEED_KMH) * 3600);
          expectedArrival = new Date(now.getTime() + timeToStationSeconds * 1000);
          currentLocation = `~${distanceKm.toFixed(1)}km away`;
        }

        // Skip if arrival is in the past or too far in the future (>60 mins)
        if (timeToStationSeconds < 0 || timeToStationSeconds > 3600) continue;

        arrivals.push({
          id: `${vehicleRef}-${targetStopIds[0]}`,
          lineName,
          destination: destinationName,
          timeToStation: timeToStationSeconds,
          expectedArrival,
          vehicleId: vehicleRef,
          currentLocation,
          towards: destinationName,
          mode: 'bus',
        });
      }
    } catch (error) {
      console.error('[BODS/SIRI-VM] XML parsing error:', error);
    }

    // Log debug info
    console.log(`[BODS/SIRI-VM] Debug: ${vehiclesWithMonitoredCall} vehicles have MonitoredCall, ${vehiclesWithOnwardCalls} have OnwardCalls`);
    if (stopsChecked.size > 0 && arrivals.length === 0) {
      // Log some sample stop IDs to help debug matching issues
      const sampleStops = Array.from(stopsChecked).slice(0, 10);
      console.log(`[BODS/SIRI-VM] Sample stop IDs in feed: ${sampleStops.join(', ')}`);
      console.log(`[BODS/SIRI-VM] Looking for any of: ${normalizedTargetIds.join(', ')}`);
    }

    // Remove duplicates and sort by arrival time
    const uniqueArrivals = this.deduplicateArrivals(arrivals);
    return uniqueArrivals.sort((a, b) => a.timeToStation - b.timeToStation).slice(0, 10);
  }

  /**
   * Find if the target stop appears in the vehicle's journey
   * Checks MonitoredCall and OnwardCalls
   *
   * @param vehicleActivity XML content for the vehicle
   * @param normalizedTargetIds Array of normalized stop IDs to match against
   * @param stopsChecked Optional set to collect all stop IDs seen (for debugging)
   */
  private findStopInJourney(
    vehicleActivity: string,
    normalizedTargetIds: string[],
    stopsChecked?: Set<string>
  ): { expectedArrivalTime?: string; aimedArrivalTime?: string; stopsAway?: number } | null {
    // Check MonitoredCall (the next stop)
    const monitoredCallMatch = vehicleActivity.match(/<MonitoredCall>([\s\S]*?)<\/MonitoredCall>/);
    if (monitoredCallMatch) {
      const monitoredCall = monitoredCallMatch[1];
      const stopPointRef = this.extractXmlValue(monitoredCall, 'StopPointRef');

      if (stopPointRef) {
        stopsChecked?.add(stopPointRef);
        if (this.isMatchingStopId(stopPointRef, normalizedTargetIds)) {
          return {
            expectedArrivalTime: this.extractXmlValue(monitoredCall, 'ExpectedArrivalTime') || undefined,
            aimedArrivalTime: this.extractXmlValue(monitoredCall, 'AimedArrivalTime') || undefined,
            stopsAway: 0, // Next stop
          };
        }
      }
    }

    // Check OnwardCalls (subsequent stops)
    const onwardCallsMatch = vehicleActivity.match(/<OnwardCalls>([\s\S]*?)<\/OnwardCalls>/);
    if (onwardCallsMatch) {
      const onwardCalls = onwardCallsMatch[1];
      const onwardCallRegex = /<OnwardCall>([\s\S]*?)<\/OnwardCall>/g;
      let callMatch;
      let stopIndex = 1; // Start at 1 since MonitoredCall is stop 0

      while ((callMatch = onwardCallRegex.exec(onwardCalls)) !== null) {
        const onwardCall = callMatch[1];
        const stopPointRef = this.extractXmlValue(onwardCall, 'StopPointRef');

        if (stopPointRef) {
          stopsChecked?.add(stopPointRef);
          if (this.isMatchingStopId(stopPointRef, normalizedTargetIds)) {
            return {
              expectedArrivalTime: this.extractXmlValue(onwardCall, 'ExpectedArrivalTime') || undefined,
              aimedArrivalTime: this.extractXmlValue(onwardCall, 'AimedArrivalTime') || undefined,
              stopsAway: stopIndex,
            };
          }
        }
        stopIndex++;
      }
    }

    // Stop not found in this vehicle's journey
    return null;
  }

  /**
   * Check if a stop reference matches any of the target stop IDs
   * Handles different ATCO code formats and variations
   *
   * @param stopRef The stop reference from the SIRI-VM feed
   * @param normalizedTargetIds Array of normalized target stop IDs
   */
  private isMatchingStopId(stopRef: string, normalizedTargetIds: string[]): boolean {
    const normalizedRef = stopRef.replace(/\s/g, '').toUpperCase();

    for (const normalizedTargetId of normalizedTargetIds) {
      // Exact match
      if (normalizedRef === normalizedTargetId) return true;

      // Check if one contains the other (handles different prefix formats)
      // e.g., "sufajwgw" might appear as "390Gsufajwgw" in some feeds
      if (normalizedRef.includes(normalizedTargetId) || normalizedTargetId.includes(normalizedRef)) {
        return true;
      }

      // Check last 8 characters (common NaPTAN short code format)
      // e.g., "390GSUFAJWGW" should match "sufajwgw"
      if (normalizedRef.length >= 8 && normalizedTargetId.length >= 8) {
        if (normalizedRef.slice(-8) === normalizedTargetId.slice(-8)) {
          return true;
        }
      }

      // Also check if the last part of the ref matches (after any prefix)
      // e.g., "390GSUFAJWGW" contains "SUFAJWGW" which should match "sufajwgw"
      const shortCode = normalizedTargetId.length === 8 ? normalizedTargetId : normalizedTargetId.slice(-8);
      if (shortCode.length >= 6 && normalizedRef.includes(shortCode)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Calculate bearing from point 1 to point 2
   */
  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = this.toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(this.toRad(lat2));
    const x = Math.cos(this.toRad(lat1)) * Math.sin(this.toRad(lat2)) -
              Math.sin(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.cos(dLon);
    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    return (bearing + 360) % 360;
  }

  /**
   * Check if vehicle is heading towards the stop (within 60 degree tolerance)
   */
  private isHeadingTowards(vehicleBearing: number, bearingToStop: number): boolean {
    // Require valid bearing to confirm vehicle is moving towards stop
    if (!vehicleBearing && vehicleBearing !== 0) return false;
    let diff = Math.abs(vehicleBearing - bearingToStop);
    if (diff > 180) diff = 360 - diff;
    return diff <= 60;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Transform NaPTAN stop data to our normalized Stop type
   */
  private transformNaptanToStop(naptan: NaptanStop): Stop {
    return {
      id: naptan.AtcoCode,
      naptanId: naptan.AtcoCode,
      name: naptan.CommonName,
      stopLetter: naptan.Indicator || undefined,
      stopCode: naptan.NaptanCode || undefined,
      direction: naptan.Bearing || undefined,
      lat: naptan.Latitude,
      lon: naptan.Longitude,
      modes: ['bus'],
      lines: [], // Lines not available in NaPTAN, would need BODS timetable data
      isGroup: naptan.StopType === 'BCT', // Bus Coach Station
    };
  }

  /**
   * Get city configuration for a stop based on ATCO code prefix
   */
  private getCityConfigForStop(stopId: string): BodsCityConfig | null {
    // ATCO codes have a 3-character area prefix
    // Suffolk (Ipswich area): 390xxxxxx
    // We could map prefixes to cities, but for now check all BODS cities
    
    for (const cityId of Object.keys(CITIES)) {
      const city = CITIES[cityId];
      if (isBodsCityConfig(city)) {
        // Check if stop falls within city's bounding box if available
        // For now, return the first BODS city (Outside London)
        return city;
      }
    }
    
    return null;
  }

  /**
   * Extract a value from an XML element
   */
  private extractXmlValue(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Remove duplicate arrivals (same vehicle, same destination)
   */
  private deduplicateArrivals(arrivals: Arrival[]): Arrival[] {
    const seen = new Map<string, Arrival>();
    
    for (const arrival of arrivals) {
      const key = `${arrival.vehicleId}-${arrival.lineName}`;
      
      // Keep the arrival with the earlier time
      if (!seen.has(key) || arrival.timeToStation < seen.get(key)!.timeToStation) {
        seen.set(key, arrival);
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Build URL with query parameters including API key
   */
  private buildUrl(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): string {
    const url = new URL(`${BODS_API_BASE_URL}${endpoint}`);
    
    const apiKey = getApiKey();
    if (apiKey) {
      url.searchParams.set('api_key', apiKey);
    }
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    
    return url.toString();
  }

  /**
   * Make a request to the BODS API
   */
  private async bodsFetch<T>(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint, params);
      
      console.log(`[BODS API] Fetching: ${endpoint}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        let errorMessage = `BODS API error: ${response.status} ${response.statusText}`;
        
        if (response.status === 401 || response.status === 403) {
          errorMessage = 'BODS API authentication failed. Please check your API key.';
        } else if (response.status === 429) {
          errorMessage = 'BODS API rate limit exceeded. Please try again later.';
        } else if (response.status === 404) {
          errorMessage = 'Resource not found on BODS API.';
        } else if (response.status >= 500) {
          errorMessage = 'BODS API is temporarily unavailable. Please try again later.';
        }
        
        console.error(`[BODS API] Error ${response.status}:`, errorText);
        
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
      console.error('[BODS API] Network error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message.includes('fetch') 
          ? 'Unable to connect to BODS API. Please check your internet connection.'
          : error.message
        : 'Unknown error occurred';
      
      return {
        success: false,
        error: errorMessage,
        details: error,
      };
    }
  }
}
