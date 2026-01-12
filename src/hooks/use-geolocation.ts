/**
 * Geolocation Hook
 *
 * Provides user's current location with loading and error states.
 */

import { useState, useCallback, useEffect } from 'react';

export interface GeolocationPosition {
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: number;
}

export interface UseGeolocationOptions {
  /** Enable high accuracy mode (uses more battery) */
  enableHighAccuracy?: boolean;
  /** Timeout for getting position in ms */
  timeout?: number;
  /** Maximum age of cached position in ms */
  maximumAge?: number;
  /** Auto-fetch location on mount */
  autoFetch?: boolean;
}

export interface UseGeolocationReturn {
  /** Current position */
  position: GeolocationPosition | null;
  /** Whether location is being fetched */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether geolocation is supported */
  isSupported: boolean;
  /** Manually trigger location fetch */
  getLocation: () => void;
  /** Clear current position and error */
  reset: () => void;
}

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000, // 1 minute cache
    autoFetch = false,
  } = options;

  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const getLocation = useCallback(() => {
    if (!isSupported) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        let errorMessage: string;
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred while getting location.';
        }
        setError(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  }, [isSupported, enableHighAccuracy, timeout, maximumAge]);

  const reset = useCallback(() => {
    setPosition(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && isSupported) {
      getLocation();
    }
  }, [autoFetch, isSupported, getLocation]);

  return {
    position,
    isLoading,
    error,
    isSupported,
    getLocation,
    reset,
  };
}

export default useGeolocation;
