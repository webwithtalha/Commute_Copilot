/**
 * Transit Provider Interface and Router
 * 
 * Provides a unified interface for multiple transit data providers (TfL, BODS, etc.)
 * and routes requests to the appropriate provider based on city configuration.
 */

import type { Stop, Arrival, ApiResponse } from '@/types/tfl';
import type { AnyCityConfig } from '@/config/cities';
import { getCityOrDefault, isBodsCityConfig } from '@/config/cities';
import { TflProvider } from './tfl-provider';
import { BodsProvider } from './bods-provider';

// ============================================================================
// Provider Interface
// ============================================================================

/** Options for searching stops */
export interface SearchStopsOptions {
  /** Search query (stop name, code, or address) */
  query: string;
  /** Maximum number of results to return */
  maxResults?: number;
  /** Transport modes to filter by */
  modes?: string[];
}

/** Options for getting stop details */
export interface GetStopDetailsOptions {
  /** Stop ID (NaPTAN/ATCO code) */
  stopId: string;
  /** Whether to include child stops for group stops */
  includeChildren?: boolean;
}

/** Options for getting arrivals */
export interface GetArrivalsOptions {
  /** Stop ID (NaPTAN/ATCO code) */
  stopId: string;
  /** Filter by specific line IDs */
  lineIds?: string[];
  /** Maximum number of arrivals to return */
  maxResults?: number;
}

/** Options for getting nearby stops */
export interface GetNearbyStopsOptions {
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
  /** Radius in meters (default: 500) */
  radius?: number;
  /** Maximum number of results */
  maxResults?: number;
}

/**
 * Unified interface that all transit providers must implement.
 * This ensures consistent behavior regardless of the underlying data source.
 */
export interface TransitProvider {
  /** Provider identifier */
  readonly providerId: string;
  
  /** Human-readable provider name */
  readonly providerName: string;
  
  /**
   * Search for stops matching a query
   * @param options Search options including query and filters
   * @returns Array of matching stops normalized to common Stop type
   */
  searchStops(options: SearchStopsOptions): Promise<ApiResponse<Stop[]>>;
  
  /**
   * Get detailed information about a specific stop
   * @param options Options including stop ID
   * @returns Stop details normalized to common Stop type
   */
  getStopDetails(options: GetStopDetailsOptions): Promise<ApiResponse<Stop>>;
  
  /**
   * Get real-time arrivals for a stop
   * @param options Options including stop ID and optional filters
   * @returns Array of arrivals normalized to common Arrival type, sorted by time
   */
  getArrivals(options: GetArrivalsOptions): Promise<ApiResponse<Arrival[]>>;

  /**
   * Get stops near a location
   * @param options Options including lat, lon, and radius
   * @returns Array of nearby stops normalized to common Stop type
   */
  getNearbyStops(options: GetNearbyStopsOptions): Promise<ApiResponse<Stop[]>>;
}

// ============================================================================
// Provider Instances (Singletons)
// ============================================================================

let tflProviderInstance: TflProvider | null = null;
let bodsProviderInstance: BodsProvider | null = null;

/**
 * Get the TfL provider instance (singleton)
 */
function getTflProvider(): TflProvider {
  if (!tflProviderInstance) {
    tflProviderInstance = new TflProvider();
  }
  return tflProviderInstance;
}

/**
 * Get the BODS provider instance (singleton)
 */
function getBodsProvider(): BodsProvider {
  if (!bodsProviderInstance) {
    bodsProviderInstance = new BodsProvider();
  }
  return bodsProviderInstance;
}

// ============================================================================
// Provider Router
// ============================================================================

/**
 * Get the appropriate transit provider for a given city configuration
 * @param city City configuration object
 * @returns The provider instance for that city
 */
export function getProviderForCity(city: AnyCityConfig): TransitProvider {
  if (isBodsCityConfig(city)) {
    return getBodsProvider();
  }
  // Default to TfL for London and any unknown providers
  return getTflProvider();
}

/**
 * Get the appropriate transit provider by city ID
 * @param cityId City identifier (e.g., 'london', 'outside-london')
 * @returns The provider instance for that city
 */
export function getProviderByCityId(cityId: string): TransitProvider {
  const city = getCityOrDefault(cityId);
  return getProviderForCity(city);
}

/**
 * Get all available provider instances
 * @returns Map of provider ID to provider instance
 */
export function getAllProviders(): Map<string, TransitProvider> {
  const providers = new Map<string, TransitProvider>();
  providers.set('tfl', getTflProvider());
  providers.set('bods', getBodsProvider());
  return providers;
}

// ============================================================================
// Convenience Functions (City-Aware)
// ============================================================================

/**
 * Search for stops in a specific city
 * @param cityId City identifier
 * @param options Search options
 * @returns Array of matching stops
 */
export async function searchStopsInCity(
  cityId: string,
  options: SearchStopsOptions
): Promise<ApiResponse<Stop[]>> {
  const provider = getProviderByCityId(cityId);
  return provider.searchStops(options);
}

/**
 * Get stop details in a specific city
 * @param cityId City identifier
 * @param options Stop details options
 * @returns Stop details
 */
export async function getStopDetailsInCity(
  cityId: string,
  options: GetStopDetailsOptions
): Promise<ApiResponse<Stop>> {
  const provider = getProviderByCityId(cityId);
  return provider.getStopDetails(options);
}

/**
 * Get arrivals for a stop in a specific city
 * @param cityId City identifier
 * @param options Arrivals options
 * @returns Array of arrivals
 */
export async function getArrivalsInCity(
  cityId: string,
  options: GetArrivalsOptions
): Promise<ApiResponse<Arrival[]>> {
  const provider = getProviderByCityId(cityId);
  return provider.getArrivals(options);
}

/**
 * Get nearby stops in a specific city
 * Uses smart fallback: tries primary provider first, falls back to secondary if needed
 * @param cityId City identifier
 * @param options Nearby stops options
 * @returns Array of nearby stops
 */
export async function getNearbyStopsInCity(
  cityId: string,
  options: GetNearbyStopsOptions
): Promise<ApiResponse<Stop[]>> {
  const city = getCityOrDefault(cityId);
  const primaryProvider = getProviderForCity(city);
  const fallbackProvider = isBodsCityConfig(city) ? getTflProvider() : getBodsProvider();

  let primaryResult: ApiResponse<Stop[]>;

  // Try primary provider first
  try {
    primaryResult = await primaryProvider.getNearbyStops(options);

    // If successful and has results, return them
    if (primaryResult.success && primaryResult.data && primaryResult.data.length > 0) {
      return primaryResult;
    }
  } catch (error) {
    console.log(`[Providers] Primary provider (${primaryProvider.providerId}) failed:`, error);
    primaryResult = {
      success: false,
      error: `Primary provider failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }

  // Fallback: if primary failed or returned no results, try the other provider
  // This helps with edge cases like outer London (TfL doesn't cover it, but BODS does)
  console.log(`[Providers] Primary provider (${primaryProvider.providerId}) returned no results, trying fallback (${fallbackProvider.providerId})`);

  try {
    const fallbackResult = await fallbackProvider.getNearbyStops(options);

    // If fallback succeeded, return its results
    if (fallbackResult.success && fallbackResult.data && fallbackResult.data.length > 0) {
      return fallbackResult;
    }
  } catch (error) {
    console.log(`[Providers] Fallback provider (${fallbackProvider.providerId}) also failed:`, error);
  }

  // If both failed, return the primary result (which has the error)
  return primaryResult;
}

// ============================================================================
// Re-exports
// ============================================================================

export { TflProvider } from './tfl-provider';
export { BodsProvider } from './bods-provider';

