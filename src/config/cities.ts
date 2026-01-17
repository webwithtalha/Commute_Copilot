/**
 * City Configuration
 * 
 * Defines supported cities with their transit providers, brand colors, and metadata.
 * This enables multi-city support while keeping the UI/UX consistent.
 */

// ============================================================================
// Provider Types
// ============================================================================

/** Supported transit data providers */
export type TransitProviderType = 'tfl' | 'bods';

// ============================================================================
// City Configuration Types
// ============================================================================

/** Base configuration for a city */
export interface CityConfig {
  /** Unique city identifier (used in URLs and storage) */
  id: string;
  /** Display name for the city */
  name: string;
  /** Region/country for context */
  region: string;
  /** Transit data provider to use */
  provider: TransitProviderType;
  /** Primary brand color (hex) */
  brandColor: string;
  /** Secondary/accent color (hex) */
  accentColor: string;
  /** Name of the primary transit operator */
  operatorName: string;
  /** Whether this city is currently enabled */
  enabled: boolean;
  /** Default location for map centering */
  defaultLocation: {
    lat: number;
    lon: number;
  };
  /** Search placeholder text */
  searchPlaceholder: string;
}

/** Extended configuration for BODS-based cities */
export interface BodsCityConfig extends CityConfig {
  provider: 'bods';
  /** BODS operator reference code(s) for filtering */
  bodsOperatorRefs: string[];
  /** NaPTAN locality codes for filtering stops */
  naptanLocalityCodes?: string[];
  /** Bounding box for geographic filtering [minLon, minLat, maxLon, maxLat] */
  boundingBox?: [number, number, number, number];
}

/** Extended configuration for TfL-based cities */
export interface TflCityConfig extends CityConfig {
  provider: 'tfl';
}

/** Union type for all city configurations */
export type AnyCityConfig = TflCityConfig | BodsCityConfig;

// ============================================================================
// City Definitions
// ============================================================================

/** London city configuration - Uses TfL API */
export const LONDON: TflCityConfig = {
  id: 'london',
  name: 'London',
  region: 'England',
  provider: 'tfl',
  brandColor: '#E1251B',      // TfL Red
  accentColor: '#0019A8',     // TfL Blue
  operatorName: 'TfL',
  enabled: true,
  defaultLocation: {
    lat: 51.5074,
    lon: -0.1278,
  },
  searchPlaceholder: 'Search for a bus stop in London...',
};

/** Outside London city configuration - Uses BODS API */
export const OUTSIDE_LONDON: BodsCityConfig = {
  id: 'outside-london',
  name: 'Outside London',
  region: 'England',
  provider: 'bods',
  brandColor: '#007D4A',      // Bus Green
  accentColor: '#00A651',     // Light Green
  operatorName: 'Various Operators',
  enabled: true,
  defaultLocation: {
    lat: 52.5,  // Central England
    lon: -1.0,
  },
  searchPlaceholder: 'Search for a bus stop outside London...',
  // Empty operator refs means search all operators
  bodsOperatorRefs: [],
  // No locality codes means search all areas
  naptanLocalityCodes: [],
  // No bounding box means search UK-wide
  boundingBox: undefined,
};

// ============================================================================
// City Registry
// ============================================================================

/** All available cities indexed by ID */
export const CITIES: Record<string, AnyCityConfig> = {
  london: LONDON,
  'outside-london': OUTSIDE_LONDON,
} as const;

/** Ordered list of city IDs for display */
export const CITY_ORDER: string[] = ['london', 'outside-london'];

/** Default city when none is selected */
export const DEFAULT_CITY_ID = 'london';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a city configuration by ID
 * @param cityId - The city identifier
 * @returns The city configuration or undefined if not found
 */
export function getCity(cityId: string): AnyCityConfig | undefined {
  return CITIES[cityId];
}

/**
 * Get a city configuration by ID, with fallback to default
 * @param cityId - The city identifier
 * @returns The city configuration or the default city
 */
export function getCityOrDefault(cityId: string | null | undefined): AnyCityConfig {
  if (cityId && CITIES[cityId]) {
    return CITIES[cityId];
  }
  return CITIES[DEFAULT_CITY_ID];
}

/**
 * Get all enabled cities
 * @returns Array of enabled city configurations
 */
export function getEnabledCities(): AnyCityConfig[] {
  return CITY_ORDER
    .map(id => CITIES[id])
    .filter(city => city?.enabled);
}

/**
 * Check if a city uses BODS provider
 * @param city - The city configuration
 * @returns True if the city uses BODS
 */
export function isBodsCityConfig(city: AnyCityConfig): city is BodsCityConfig {
  return city.provider === 'bods';
}

/**
 * Check if a city uses TfL provider
 * @param city - The city configuration
 * @returns True if the city uses TfL
 */
export function isTflCityConfig(city: AnyCityConfig): city is TflCityConfig {
  return city.provider === 'tfl';
}

/**
 * Get CSS custom property values for a city's theme
 * @param city - The city configuration
 * @returns Object with CSS variable names and values
 */
export function getCityThemeVars(city: AnyCityConfig): Record<string, string> {
  return {
    '--city-brand': city.brandColor,
    '--city-accent': city.accentColor,
  };
}

/**
 * Get the provider type for a city
 * @param cityId - The city identifier
 * @returns The provider type or undefined if city not found
 */
export function getProviderForCity(cityId: string): TransitProviderType | undefined {
  const city = CITIES[cityId];
  return city?.provider;
}

// ============================================================================
// Location Detection
// ============================================================================

/**
 * Greater London bounding box (approximate)
 * Used for auto-detecting if a location is in London
 */
const LONDON_BOUNDS = {
  north: 51.69,
  south: 51.28,
  east: 0.33,
  west: -0.51,
};

/**
 * Check if coordinates are within Greater London
 * @param lat Latitude
 * @param lon Longitude
 * @returns True if coordinates are in London
 */
export function isInLondon(lat: number, lon: number): boolean {
  return (
    lat >= LONDON_BOUNDS.south &&
    lat <= LONDON_BOUNDS.north &&
    lon >= LONDON_BOUNDS.west &&
    lon <= LONDON_BOUNDS.east
  );
}

/**
 * Get the appropriate city ID based on coordinates
 * @param lat Latitude
 * @param lon Longitude
 * @returns City ID ('london' or 'outside-london')
 */
export function getCityIdForLocation(lat: number, lon: number): string {
  return isInLondon(lat, lon) ? 'london' : 'outside-london';
}

// ============================================================================
// Type Exports
// ============================================================================

export type CityId = keyof typeof CITIES;

