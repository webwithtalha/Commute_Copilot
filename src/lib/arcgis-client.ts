/**
 * ArcGIS Bus Stops API Client
 * Server-side wrapper for the TfL ArcGIS Bus Stops dataset
 * @see https://tfl-gis-opendata-hub-tfl.hub.arcgis.com/
 */

import type {
  ArcGISQueryResponse,
  ArcGISFeature,
  ArcGISBusStopAttributes,
  StopCode,
  ApiResponse,
} from '@/types/tfl';

// ============================================================================
// Configuration
// ============================================================================

const ARCGIS_BASE_URL =
  'https://services.arcgis.com/ZpiSvLVJaFhqVbVB/ArcGIS/rest/services/Bus_Stops/FeatureServer/0/query';

/** Default fields to retrieve from ArcGIS */
const DEFAULT_OUT_FIELDS = [
  'OBJECTID',
  'STOP_CODE',
  'COUNTDOWN_CODE',
  'ATCO_CODE',
  'STOP_NAME',
  'STOP_LETTER',
  'TOWARDS',
  'HEADING',
  'BOROUGH',
  'ON_STREET',
  'LOCALITY',
].join(',');

/** Fields for minimal stop code queries */
const MINIMAL_OUT_FIELDS = [
  'STOP_CODE',
  'COUNTDOWN_CODE',
  'ATCO_CODE',
  'STOP_NAME',
  'STOP_LETTER',
  'TOWARDS',
].join(',');

// ============================================================================
// Query Builder
// ============================================================================

interface ArcGISQueryParams {
  /** SQL WHERE clause */
  where: string;
  /** Fields to return */
  outFields?: string;
  /** Include geometry in response */
  returnGeometry?: boolean;
  /** Response format */
  f?: 'json' | 'geojson' | 'html';
  /** Maximum records to return */
  resultRecordCount?: number;
  /** Order by clause */
  orderByFields?: string;
}

/**
 * Build query URL for ArcGIS API
 */
function buildQueryUrl(params: ArcGISQueryParams): string {
  const url = new URL(ARCGIS_BASE_URL);
  
  url.searchParams.set('where', params.where);
  url.searchParams.set('outFields', params.outFields || DEFAULT_OUT_FIELDS);
  url.searchParams.set('returnGeometry', String(params.returnGeometry ?? false));
  url.searchParams.set('f', params.f || 'json');
  
  if (params.resultRecordCount) {
    url.searchParams.set('resultRecordCount', String(params.resultRecordCount));
  }
  
  if (params.orderByFields) {
    url.searchParams.set('orderByFields', params.orderByFields);
  }
  
  return url.toString();
}

/**
 * Make a query to the ArcGIS API
 */
async function arcgisFetch(
  params: ArcGISQueryParams,
  options: { revalidate?: number } = {}
): Promise<ApiResponse<ArcGISQueryResponse>> {
  try {
    const url = buildQueryUrl(params);
    console.log(`[ArcGIS] Fetching: ${url}`);
    
    const response = await fetch(url, {
      next: options.revalidate ? { revalidate: options.revalidate } : undefined,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `ArcGIS API error: ${response.status} ${response.statusText}`,
        details: errorText,
        statusCode: response.status,
      };
    }

    const data = await response.json();
    
    // Check for ArcGIS-specific error response
    if (data.error) {
      return {
        success: false,
        error: `ArcGIS error: ${data.error.message || 'Unknown error'}`,
        details: data.error,
        statusCode: data.error.code,
      };
    }
    
    return {
      success: true,
      data: data as ArcGISQueryResponse,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error,
    };
  }
}

// ============================================================================
// Stop Code Queries
// ============================================================================

/**
 * Get stop code information by ATCO/NaPTAN code
 * @param atcoCode The ATCO code (e.g., "490008481E")
 * @returns Stop code data from ArcGIS
 */
export async function getStopCodeByAtco(
  atcoCode: string
): Promise<ApiResponse<StopCode | null>> {
  // Sanitize input to prevent SQL injection
  const sanitizedCode = atcoCode.replace(/[^a-zA-Z0-9]/g, '');
  
  const result = await arcgisFetch(
    {
      where: `ATCO_CODE = '${sanitizedCode}'`,
      outFields: MINIMAL_OUT_FIELDS,
      resultRecordCount: 1,
    },
    { revalidate: 604800 } // Cache for 7 days
  );
  
  if (!result.success) {
    return result;
  }
  
  if (!result.data.features || result.data.features.length === 0) {
    return {
      success: true,
      data: null,
      timestamp: new Date().toISOString(),
    };
  }
  
  const feature = result.data.features[0];
  const stopCode = transformToStopCode(feature);
  
  return {
    success: true,
    data: stopCode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get stop code information for multiple ATCO codes
 * @param atcoCodes Array of ATCO codes
 * @returns Map of ATCO code to stop code data
 */
export async function getStopCodesByAtcoCodes(
  atcoCodes: string[]
): Promise<ApiResponse<Map<string, StopCode>>> {
  if (atcoCodes.length === 0) {
    return {
      success: true,
      data: new Map(),
      timestamp: new Date().toISOString(),
    };
  }
  
  // Sanitize all codes
  const sanitizedCodes = atcoCodes.map((code) =>
    code.replace(/[^a-zA-Z0-9]/g, '')
  );
  
  // Build IN clause
  const inClause = sanitizedCodes.map((code) => `'${code}'`).join(',');
  
  const result = await arcgisFetch(
    {
      where: `ATCO_CODE IN (${inClause})`,
      outFields: MINIMAL_OUT_FIELDS,
    },
    { revalidate: 604800 } // Cache for 7 days
  );
  
  if (!result.success) {
    return result;
  }
  
  const stopCodesMap = new Map<string, StopCode>();
  
  for (const feature of result.data.features) {
    const stopCode = transformToStopCode(feature);
    stopCodesMap.set(stopCode.atcoCode, stopCode);
  }
  
  return {
    success: true,
    data: stopCodesMap,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Search stops by 5-digit public stop code
 * @param stopCode The 5-digit stop code (e.g., "47829")
 * @returns Stop code data if found
 */
export async function getStopByStopCode(
  stopCode: string
): Promise<ApiResponse<StopCode | null>> {
  // Validate and sanitize - stop codes are 5 digits
  const sanitizedCode = stopCode.replace(/[^0-9]/g, '');
  
  if (sanitizedCode.length !== 5) {
    return {
      success: false,
      error: 'Invalid stop code format. Must be 5 digits.',
    };
  }
  
  const result = await arcgisFetch(
    {
      where: `STOP_CODE = '${sanitizedCode}'`,
      outFields: MINIMAL_OUT_FIELDS,
      resultRecordCount: 1,
    },
    { revalidate: 604800 } // Cache for 7 days
  );
  
  if (!result.success) {
    return result;
  }
  
  if (!result.data.features || result.data.features.length === 0) {
    return {
      success: true,
      data: null,
      timestamp: new Date().toISOString(),
    };
  }
  
  const feature = result.data.features[0];
  const stopCodeData = transformToStopCode(feature);
  
  return {
    success: true,
    data: stopCodeData,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Search stops by name (partial match)
 * @param name Stop name to search for
 * @param maxResults Maximum number of results
 * @returns Array of matching stop codes
 */
export async function searchStopsByName(
  name: string,
  maxResults: number = 20
): Promise<ApiResponse<StopCode[]>> {
  // Sanitize input - remove special characters that could break the LIKE query
  const sanitizedName = name.replace(/[%_'"\\]/g, '').trim();
  
  if (sanitizedName.length < 2) {
    return {
      success: false,
      error: 'Search query must be at least 2 characters',
    };
  }
  
  const result = await arcgisFetch(
    {
      where: `UPPER(STOP_NAME) LIKE UPPER('%${sanitizedName}%')`,
      outFields: MINIMAL_OUT_FIELDS,
      resultRecordCount: maxResults,
      orderByFields: 'STOP_NAME',
    },
    { revalidate: 300 } // Cache for 5 minutes
  );
  
  if (!result.success) {
    return result;
  }
  
  const stopCodes = result.data.features.map(transformToStopCode);
  
  return {
    success: true,
    data: stopCodes,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get all stops in a specific borough
 * @param borough Borough name (e.g., "Westminster")
 * @returns Array of stop codes in the borough
 */
export async function getStopsByBorough(
  borough: string
): Promise<ApiResponse<StopCode[]>> {
  // Sanitize input
  const sanitizedBorough = borough.replace(/['"\\]/g, '').trim();
  
  const result = await arcgisFetch(
    {
      where: `UPPER(BOROUGH) = UPPER('${sanitizedBorough}')`,
      outFields: MINIMAL_OUT_FIELDS,
      orderByFields: 'STOP_NAME',
    },
    { revalidate: 86400 } // Cache for 24 hours
  );
  
  if (!result.success) {
    return result;
  }
  
  const stopCodes = result.data.features.map(transformToStopCode);
  
  return {
    success: true,
    data: stopCodes,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get all stops on a specific street
 * @param streetName Street name to search
 * @returns Array of stop codes on the street
 */
export async function getStopsByStreet(
  streetName: string
): Promise<ApiResponse<StopCode[]>> {
  // Sanitize input
  const sanitizedStreet = streetName.replace(/['"\\]/g, '').trim();
  
  const result = await arcgisFetch(
    {
      where: `UPPER(ON_STREET) LIKE UPPER('%${sanitizedStreet}%')`,
      outFields: MINIMAL_OUT_FIELDS,
      orderByFields: 'STOP_NAME',
    },
    { revalidate: 86400 } // Cache for 24 hours
  );
  
  if (!result.success) {
    return result;
  }
  
  const stopCodes = result.data.features.map(transformToStopCode);
  
  return {
    success: true,
    data: stopCodes,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Transform ArcGIS feature to StopCode type
 */
export function transformToStopCode(feature: ArcGISFeature): StopCode {
  const attrs = feature.attributes;
  
  return {
    atcoCode: attrs.ATCO_CODE,
    stopCode: attrs.STOP_CODE,
    countdownCode: attrs.COUNTDOWN_CODE,
    commonName: attrs.STOP_NAME,
    stopLetter: attrs.STOP_LETTER,
    towards: attrs.TOWARDS,
  };
}

/**
 * Transform ArcGIS attributes directly to StopCode
 */
export function transformAttributesToStopCode(
  attrs: ArcGISBusStopAttributes
): StopCode {
  return {
    atcoCode: attrs.ATCO_CODE,
    stopCode: attrs.STOP_CODE,
    countdownCode: attrs.COUNTDOWN_CODE,
    commonName: attrs.STOP_NAME,
    stopLetter: attrs.STOP_LETTER,
    towards: attrs.TOWARDS,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate if a string is a valid 5-digit stop code format
 */
export function isValidStopCode(code: string): boolean {
  return /^\d{5}$/.test(code);
}

/**
 * Validate if a string could be an ATCO code format
 * ATCO codes typically follow patterns like "490008481E"
 */
export function isValidAtcoCode(code: string): boolean {
  return /^[0-9]{9}[A-Z]?$/.test(code) || /^490G?[0-9]+[A-Z]?$/.test(code);
}

/**
 * Determine if a search query is likely a stop code vs. name search
 */
export function isStopCodeQuery(query: string): boolean {
  const trimmed = query.trim();
  // 5-digit numbers are stop codes
  return /^\d{5}$/.test(trimmed);
}

// ============================================================================
// Export ArcGIS Client Object
// ============================================================================

export const arcgisClient = {
  getStopCodeByAtco,
  getStopCodesByAtcoCodes,
  getStopByStopCode,
  searchStopsByName,
  getStopsByBorough,
  getStopsByStreet,
  transformToStopCode,
  transformAttributesToStopCode,
  isValidStopCode,
  isValidAtcoCode,
  isStopCodeQuery,
};

export default arcgisClient;

