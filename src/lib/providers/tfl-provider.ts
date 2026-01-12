/**
 * TfL Transit Provider
 * 
 * Implements the TransitProvider interface using the TfL Unified API.
 * Wraps the existing tfl-client with normalized output types.
 */

import type { Stop, Arrival, ApiResponse, TflSearchMatch } from '@/types/tfl';
import type { 
  TransitProvider, 
  SearchStopsOptions, 
  GetStopDetailsOptions, 
  GetArrivalsOptions 
} from './index';
import { 
  searchStops as tflSearchStops,
  getStopDetails as tflGetStopDetails,
  getArrivals as tflGetArrivals,
  transformToStop,
  transformArrivals,
} from '@/lib/tfl-client';

// ============================================================================
// TfL Provider Implementation
// ============================================================================

/**
 * TfL Provider class implementing the TransitProvider interface.
 * Uses the TfL Unified API for London transit data.
 */
export class TflProvider implements TransitProvider {
  readonly providerId = 'tfl';
  readonly providerName = 'Transport for London';

  /**
   * Search for stops using TfL API
   */
  async searchStops(options: SearchStopsOptions): Promise<ApiResponse<Stop[]>> {
    const { query, maxResults, modes } = options;
    
    // Convert modes array to comma-separated string for TfL API
    const modesStr = modes?.length ? modes.join(',') : 'bus';
    
    const result = await tflSearchStops({
      query,
      modes: modesStr,
      maxResults,
    });

    if (!result.success) {
      return result;
    }

    // Transform TfL search matches to normalized Stop type
    const stops = result.data.matches.map((match) => 
      this.transformSearchMatchToStop(match)
    );

    return {
      success: true,
      data: stops,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get stop details using TfL API
   */
  async getStopDetails(options: GetStopDetailsOptions): Promise<ApiResponse<Stop>> {
    const { stopId } = options;

    const result = await tflGetStopDetails({
      stopId,
    });

    if (!result.success) {
      return result;
    }

    // Transform TfL stop point to normalized Stop type
    const stop = transformToStop(result.data);

    // Enrich with SMS code if available
    if (result.data.smsCode) {
      stop.stopCode = result.data.smsCode;
    }

    return {
      success: true,
      data: stop,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get real-time arrivals using TfL API
   */
  async getArrivals(options: GetArrivalsOptions): Promise<ApiResponse<Arrival[]>> {
    const { stopId, lineIds } = options;

    const result = await tflGetArrivals({
      stopId,
      lineIds,
    });

    if (!result.success) {
      return result;
    }

    // Transform TfL arrivals to normalized Arrival type
    const arrivals = transformArrivals(result.data);

    // Apply maxResults limit if specified
    const limitedArrivals = options.maxResults 
      ? arrivals.slice(0, options.maxResults)
      : arrivals;

    return {
      success: true,
      data: limitedArrivals,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Transform a TfL search match to the normalized Stop type
   */
  private transformSearchMatchToStop(match: TflSearchMatch): Stop {
    return {
      id: match.id,
      naptanId: match.id, // For search results, id is typically the NaPTAN ID
      name: match.name,
      stopLetter: match.stopLetter,
      lat: match.lat,
      lon: match.lon,
      modes: match.modes || [],
      lines: match.lines || [],
      isGroup: match.stopType === 'TransportInterchange' || 
               match.id.startsWith('490G'),
    };
  }
}

