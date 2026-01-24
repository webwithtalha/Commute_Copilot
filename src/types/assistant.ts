/**
 * AI Commute Assistant Type Definitions
 * Types for journey planning and recommendations
 */

// ============================================================================
// Journey Request/Response Types
// ============================================================================

/** Request for journey planning */
export interface JourneyRequest {
  /** Destination stop NaPTAN ID */
  destinationStopId: string;
  /** Desired arrival time in ISO 8601 format */
  desiredArrivalTime: string;
  /** User's current latitude (optional) */
  originLat?: number;
  /** User's current longitude (optional) */
  originLon?: number;
}

/** A recommended departure option */
export interface JourneyRecommendation {
  /** Unique identifier for this recommendation */
  id: string;
  /** Recommended departure time (ISO 8601) */
  departureTime: string;
  /** Expected arrival time (ISO 8601) */
  arrivalTime: string;
  /** Confidence score from 0-100 */
  confidenceScore: number;
  /** Confidence level category */
  confidenceLevel: 'safe' | 'moderate' | 'tight';
  /** Total journey duration in minutes */
  totalDurationMinutes: number;
  /** Breakdown of journey segments */
  segments: JourneySegment[];
  /** Any warnings for this journey */
  warnings: JourneyWarning[];
}

/** A segment of the journey */
export interface JourneySegment {
  /** Type of segment */
  type: 'walk' | 'bus' | 'wait';
  /** Duration of this segment in minutes */
  durationMinutes: number;
  /** Human-readable description */
  description: string;
  /** Bus line name (if type is 'bus') */
  lineName?: string;
  /** Stop name (if applicable) */
  stopName?: string;
}

/** Warning about the journey */
export interface JourneyWarning {
  /** Type of warning */
  type: 'weather' | 'reliability' | 'disruption';
  /** Severity level */
  severity: 'info' | 'warning' | 'critical';
  /** Human-readable warning message */
  message: string;
}

// ============================================================================
// Weather Types
// ============================================================================

/** Weather conditions from API */
export interface WeatherConditions {
  /** Temperature in Celsius */
  temperature: number;
  /** Weather condition category */
  condition: 'clear' | 'cloudy' | 'rain' | 'heavy_rain' | 'snow';
  /** Probability of precipitation (0-100) */
  precipitationProbability: number;
  /** Weather condition description */
  description?: string;
  /** Weather icon code (Open-Meteo WMO codes) */
  weatherCode?: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/** Successful journey planning response */
export interface JourneyPlanningResponse {
  success: true;
  recommendations: JourneyRecommendation[];
  weather: WeatherConditions | null;
  destinationName: string;
  requestedArrivalTime: string;
}

/** Error journey planning response */
export interface JourneyPlanningError {
  success: false;
  error: string;
  code?: string;
}

/** Union type for journey planning API response */
export type JourneyApiResponse = JourneyPlanningResponse | JourneyPlanningError;

// ============================================================================
// Type Guards
// ============================================================================

/** Check if response is successful */
export function isJourneySuccess(
  response: JourneyApiResponse
): response is JourneyPlanningResponse {
  return response.success === true;
}

/** Check if response is an error */
export function isJourneyError(
  response: JourneyApiResponse
): response is JourneyPlanningError {
  return response.success === false;
}

// ============================================================================
// Claude API Types (internal)
// ============================================================================

/** Data passed to Claude for analysis */
export interface ClaudeJourneyInput {
  destinationStop: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    lines: string[];
  };
  arrivals: Array<{
    lineName: string;
    destinationName: string;
    expectedArrival: string;
    timeToStation: number;
  }>;
  weather: WeatherConditions | null;
  desiredArrivalTime: string;
  userLocation?: {
    lat: number;
    lon: number;
  };
  currentTime: string;
}

/** Claude's response structure */
export interface ClaudeJourneyOutput {
  recommendations: Array<{
    departureTime: string;
    arrivalTime: string;
    confidenceScore: number;
    totalDurationMinutes: number;
    segments: JourneySegment[];
    reasoning: string;
  }>;
  warnings: JourneyWarning[];
}
