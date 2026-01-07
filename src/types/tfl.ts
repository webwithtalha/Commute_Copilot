/**
 * TfL API Type Definitions
 * Based on TfL Unified API documentation
 * @see https://api.tfl.gov.uk/
 */

// ============================================================================
// TfL Unified API Types - Raw Response Types
// ============================================================================

/** Stop point from TfL API search/details endpoints */
export interface TflStopPoint {
  /** Unique identifier (e.g., "490G00008481" for groups, "490008481E" for individual) */
  id: string;
  /** NaPTAN identifier */
  naptanId: string;
  /** Human-readable stop name (e.g., "Sycamore Avenue") */
  commonName: string;
  /** Letter displayed on bus stop pole (e.g., "C", "D") */
  stopLetter?: string;
  /** Direction indicator (e.g., "Stop C", "towards Town Centre") */
  indicator?: string;
  /** Type of stop (e.g., "NaptanPublicBusCoachTram") */
  stopType: string;
  /** SMS code - the 5-digit stop code used for text arrivals (e.g., "47829") */
  smsCode?: string;
  /** ICS code identifier */
  icsCode?: string;
  /** Latitude coordinate */
  lat: number;
  /** Longitude coordinate */
  lon: number;
  /** Transport modes available at this stop (e.g., ["bus"]) */
  modes: string[];
  /** Lines serving this stop */
  lines: TflLine[];
  /** Additional metadata properties */
  additionalProperties?: TflProperty[];
  /** Child stops (for group stops only) */
  children?: TflStopPoint[];
  /** Status of the stop (true = active) */
  status?: boolean;
  /** URL for more information */
  url?: string;
  /** Place type classification */
  placeType?: string;
}

/** Line information from TfL API */
export interface TflLine {
  /** Line identifier (e.g., "25", "73") */
  id: string;
  /** Human-readable line name (e.g., "25", "Northern") */
  name: string;
  /** Mode of transport (e.g., "bus", "tube", "dlr") */
  modeName: string;
  /** Type of route */
  routeType: string;
  /** Line disruptions if any */
  disruptions?: TflDisruption[];
}

/** Disruption information */
export interface TflDisruption {
  /** Disruption category */
  category: string;
  /** Type of disruption */
  type: string;
  /** Category description */
  categoryDescription: string;
  /** Detailed description */
  description: string;
  /** Additional information */
  additionalInfo?: string;
  /** Affected routes */
  affectedRoutes?: string[];
  /** Affected stops */
  affectedStops?: string[];
  /** Created timestamp */
  created?: string;
  /** Last update timestamp */
  lastUpdate?: string;
}

/** Additional property on stop point */
export interface TflProperty {
  /** Property category */
  category: string;
  /** Property key */
  key: string;
  /** Property value */
  value: string;
  /** Last modified timestamp */
  modified?: string;
  /** Source system */
  sourceSystemKey?: string;
}

/** Arrival prediction from TfL API */
export interface TflArrival {
  /** Unique arrival ID */
  id: string;
  /** NaPTAN ID of the stop */
  naptanId: string;
  /** Name of the station/stop */
  stationName: string;
  /** Line identifier */
  lineId: string;
  /** Human-readable line name */
  lineName: string;
  /** Final destination name */
  destinationName: string;
  /** Destination NaPTAN ID */
  destinationNaptanId: string;
  /** Direction of travel */
  direction: string;
  /** Platform/stop information */
  platformName: string;
  /** Bearing in degrees */
  bearing: string;
  /** Timestamp of prediction */
  timestamp: string;
  /** Seconds until arrival */
  timeToStation: number;
  /** Current location of vehicle */
  currentLocation: string;
  /** Towards indicator (direction description) */
  towards: string;
  /** Expected arrival time (ISO 8601 string) */
  expectedArrival: string;
  /** Mode of transport */
  modeName: string;
  /** Vehicle identifier */
  vehicleId: string;
  /** Time to live for this prediction in seconds */
  timeToLive?: string;
  /** Operator name */
  operatorName?: string;
}

/** Search result response from TfL API */
export interface TflSearchResponse {
  /** URL to get the full list */
  $type?: string;
  /** Total number of matches */
  total: number;
  /** Query string used */
  query?: string;
  /** Matched stop points */
  matches: TflSearchMatch[];
}

/** Individual search match from TfL API */
export interface TflSearchMatch {
  /** Stop point ID */
  id: string;
  /** Full URL to the stop */
  url?: string;
  /** Stop name */
  name: string;
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
  /** Available transport modes */
  modes: string[];
  /** ICS identifier */
  icsId?: string;
  /** Fare zone(s) */
  zone?: string;
  /** Stop letter */
  stopLetter?: string;
  /** Lines serving this stop (as array of line IDs) */
  lines?: string[];
  /** Whether stop is active */
  status?: boolean;
  /** Parent stop ID for grouped stops */
  topMostParentId?: string;
  /** Stop type */
  stopType?: string;
}

/** Line status response from TfL API */
export interface TflLineStatus {
  /** Line identifier */
  id: string;
  /** Line name */
  name: string;
  /** Mode of transport */
  modeName: string;
  /** Current status severities */
  lineStatuses: TflLineStatusDetail[];
  /** Route sections */
  routeSections?: TflRouteSection[];
  /** Service types */
  serviceTypes?: TflServiceType[];
}

/** Detailed line status information */
export interface TflLineStatusDetail {
  /** Status ID */
  id: number;
  /** Severity of the status */
  statusSeverity: number;
  /** Description of the severity level */
  statusSeverityDescription: string;
  /** Reason for the status */
  reason?: string;
  /** Validity periods */
  validityPeriods?: TflValidityPeriod[];
  /** Disruption details */
  disruption?: TflDisruption;
}

/** Route section information */
export interface TflRouteSection {
  /** Route section name */
  name: string;
  /** Direction */
  direction: string;
  /** Origin name */
  originationName: string;
  /** Destination name */
  destinationName: string;
}

/** Service type information */
export interface TflServiceType {
  /** Service type name */
  name: string;
  /** Service type URI */
  uri: string;
}

/** Validity period for status information */
export interface TflValidityPeriod {
  /** Start of validity */
  fromDate: string;
  /** End of validity */
  toDate: string;
  /** Whether dates are known */
  isNow: boolean;
}

// ============================================================================
// ArcGIS Bus Stops API Types
// ============================================================================

/** Raw response from ArcGIS query endpoint */
export interface ArcGISQueryResponse {
  /** Object ID field alias */
  objectIdFieldName?: string;
  /** Unique ID field */
  uniqueIdField?: {
    name: string;
    isSystemMaintained: boolean;
  };
  /** Global ID field name */
  globalIdFieldName?: string;
  /** Geometry type */
  geometryType?: string;
  /** Spatial reference */
  spatialReference?: {
    wkid: number;
    latestWkid: number;
  };
  /** Field definitions */
  fields?: ArcGISField[];
  /** Query results */
  features: ArcGISFeature[];
  /** Whether results exceeded transfer limit */
  exceededTransferLimit?: boolean;
}

/** Field definition in ArcGIS response */
export interface ArcGISField {
  /** Field name */
  name: string;
  /** Field type */
  type: string;
  /** Alias for display */
  alias: string;
  /** SQL type */
  sqlType: string;
  /** Length for string fields */
  length?: number;
  /** Domain for coded values */
  domain?: unknown;
  /** Default value */
  defaultValue?: unknown;
}

/** Individual feature from ArcGIS query */
export interface ArcGISFeature {
  /** Feature attributes */
  attributes: ArcGISBusStopAttributes;
  /** Geometry if requested */
  geometry?: {
    x: number;
    y: number;
  };
}

/** Bus stop attributes from TfL ArcGIS dataset */
export interface ArcGISBusStopAttributes {
  /** Object ID */
  OBJECTID?: number;
  /** 5-digit public stop code displayed on pole */
  STOP_CODE: string;
  /** Code used for countdown displays */
  COUNTDOWN_CODE: string;
  /** NaPTAN/ATCO identifier (e.g., "490008481E") */
  ATCO_CODE: string;
  /** Stop name */
  STOP_NAME: string;
  /** Letter on the stop pole (e.g., "C", "D") */
  STOP_LETTER: string | null;
  /** Direction/towards indicator */
  TOWARDS: string | null;
  /** Compass heading in degrees */
  HEADING: number | null;
  /** Borough name */
  BOROUGH: string | null;
  /** Virtual stop flag (Y/N) */
  VIRTUAL_BUS_STOP: string | null;
  /** On street name */
  ON_STREET: string | null;
  /** Locality name */
  LOCALITY: string | null;
  /** Bus station indicator */
  BUS_STATION_IND: string | null;
}

/** Simplified stop code data from ArcGIS */
export interface StopCode {
  /** NaPTAN/ATCO code */
  atcoCode: string;
  /** 5-digit public stop code */
  stopCode: string;
  /** Countdown/cleardown display code */
  countdownCode: string;
  /** Stop name */
  commonName: string;
  /** Stop letter on pole */
  stopLetter: string | null;
  /** Direction indicator */
  towards: string | null;
}

// ============================================================================
// Application-Specific Types (Normalized/Enriched Data)
// ============================================================================

/** Application-specific stop with enriched data from both TfL and ArcGIS */
export interface Stop {
  /** TfL stop ID */
  id: string;
  /** NaPTAN identifier */
  naptanId: string;
  /** Human-readable stop name */
  name: string;
  /** Letter displayed on bus stop pole */
  stopLetter?: string;
  /** 5-digit public stop code from ArcGIS */
  stopCode?: string;
  /** Direction/towards indicator */
  direction?: string;
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
  /** Transport modes available */
  modes: string[];
  /** Line IDs serving this stop */
  lines: string[];
  /** Whether this is a group stop with children */
  isGroup?: boolean;
  /** Number of child stops (for groups) */
  childCount?: number;
}

/** Application-specific arrival with formatted data */
export interface Arrival {
  /** Unique arrival ID */
  id: string;
  /** Bus/line number */
  lineName: string;
  /** Final destination */
  destination: string;
  /** Seconds until arrival */
  timeToStation: number;
  /** Expected arrival timestamp */
  expectedArrival: Date;
  /** Platform/bay information */
  platform?: string;
  /** Direction indicator */
  towards?: string;
  /** Vehicle identifier */
  vehicleId: string;
  /** Current location description */
  currentLocation?: string;
  /** Transport mode */
  mode: string;
}

/** Stop with arrivals data combined */
export interface StopWithArrivals {
  /** Stop information */
  stop: Stop;
  /** Live arrivals */
  arrivals: Arrival[];
  /** Last updated timestamp */
  lastUpdated: Date;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

/** Generic API response wrapper for success states */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  /** Cache metadata */
  cached?: boolean;
  /** Timestamp of response */
  timestamp?: string;
}

/** Generic API response wrapper for error states */
export interface ApiError {
  success: false;
  error: string;
  /** Detailed error information */
  details?: unknown;
  /** HTTP status code */
  statusCode?: number;
}

/** Union type for API responses */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  /** Data items */
  items: T[];
  /** Total count */
  total: number;
  /** Current page */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Whether more pages exist */
  hasMore: boolean;
}

// ============================================================================
// Search and Filter Types
// ============================================================================

/** Search query parameters */
export interface SearchParams {
  /** Search query string */
  query: string;
  /** Transport modes to filter by */
  modes?: string[];
  /** Maximum number of results */
  maxResults?: number;
  /** Center point for proximity search */
  center?: {
    lat: number;
    lon: number;
  };
  /** Radius in meters for proximity search */
  radius?: number;
}

/** Arrivals query parameters */
export interface ArrivalsParams {
  /** Stop ID or NaPTAN ID */
  stopId: string;
  /** Filter by specific line(s) */
  lineIds?: string[];
  /** Filter by direction */
  direction?: 'inbound' | 'outbound' | 'all';
  /** Maximum number of arrivals to return */
  count?: number;
}

// ============================================================================
// Transport Mode Types
// ============================================================================

/** Valid TfL transport modes */
export type TransportMode =
  | 'bus'
  | 'tube'
  | 'dlr'
  | 'overground'
  | 'elizabeth-line'
  | 'tram'
  | 'river-bus'
  | 'cable-car'
  | 'national-rail'
  | 'coach';

/** Mode display configuration */
export interface ModeConfig {
  /** Mode identifier */
  id: TransportMode;
  /** Display name */
  name: string;
  /** Brand color (hex) */
  color: string;
  /** Icon name */
  icon: string;
}

/** Default mode configurations */
export const MODE_CONFIGS: Record<TransportMode, ModeConfig> = {
  bus: { id: 'bus', name: 'Bus', color: '#E1251B', icon: 'bus' },
  tube: { id: 'tube', name: 'Tube', color: '#0019A8', icon: 'train' },
  dlr: { id: 'dlr', name: 'DLR', color: '#00A0A0', icon: 'train' },
  overground: { id: 'overground', name: 'Overground', color: '#EF7B10', icon: 'train' },
  'elizabeth-line': { id: 'elizabeth-line', name: 'Elizabeth line', color: '#6950A1', icon: 'train' },
  tram: { id: 'tram', name: 'Tram', color: '#6CBE45', icon: 'tram' },
  'river-bus': { id: 'river-bus', name: 'River Bus', color: '#00A0E2', icon: 'ship' },
  'cable-car': { id: 'cable-car', name: 'Cable Car', color: '#E21836', icon: 'cable-car' },
  'national-rail': { id: 'national-rail', name: 'National Rail', color: '#E83D23', icon: 'train' },
  coach: { id: 'coach', name: 'Coach', color: '#F9BE00', icon: 'bus' },
};

// ============================================================================
// Accessibility Types
// ============================================================================

/** Step-free accessibility information */
export interface StepFreeInfo {
  /** Station/stop ID */
  stationId: string;
  /** Level of accessibility */
  accessibilityType: 'full' | 'partial' | 'none';
  /** Additional notes */
  notes: string[];
  /** Lift status information */
  lifts: LiftStatus[];
}

/** Individual lift status */
export interface LiftStatus {
  /** Lift identifier */
  id: string;
  /** Current operational status */
  status: 'working' | 'not_working' | 'unknown';
  /** Description/location of lift */
  description?: string;
  /** Expected return to service (if not working) */
  expectedReturn?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/** Type guard to check if response is successful */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response.success === true;
}

/** Type guard to check if response is an error */
export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return response.success === false;
}

/** Type guard to check if a stop is a group stop (has children) */
export function isGroupStop(stop: TflStopPoint): boolean {
  return Boolean(stop.children && stop.children.length > 0);
}

/** Type guard to check if stop has a valid stop letter */
export function hasStopLetter(stop: TflStopPoint | Stop): boolean {
  return Boolean(stop.stopLetter && stop.stopLetter.trim().length > 0);
}
