'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type AnyCityConfig,
  CITIES,
  DEFAULT_CITY_ID,
  getCityOrDefault,
  getCityThemeVars,
  getEnabledCities,
} from '@/config/cities';

// ============================================================================
// Constants
// ============================================================================

/** LocalStorage key for persisting city selection */
const CITY_STORAGE_KEY = 'commute-copilot-city';

// ============================================================================
// Context Types
// ============================================================================

interface CityContextValue {
  /** The currently selected city configuration */
  city: AnyCityConfig;
  /** The city ID string */
  cityId: string;
  /** Function to change the selected city */
  setCity: (cityId: string) => void;
  /** All enabled cities for selection */
  enabledCities: AnyCityConfig[];
  /** Whether the context has been hydrated from storage */
  isHydrated: boolean;
}

// ============================================================================
// Context
// ============================================================================

const CityContext = createContext<CityContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface CityProviderProps {
  children: ReactNode;
  /** Optional initial city ID (for SSR or testing) */
  initialCityId?: string;
}

/**
 * CityProvider - Manages the selected city state globally
 * 
 * Features:
 * - Persists city selection in localStorage
 * - Applies city theme CSS variables to document root
 * - Sets data-city attribute on root for CSS targeting
 * - Provides context for all city-related operations
 */
export function CityProvider({ children, initialCityId }: CityProviderProps) {
  // Initialize with default city (will be updated after hydration)
  const [cityId, setCityId] = useState<string>(initialCityId ?? DEFAULT_CITY_ID);
  const [isHydrated, setIsHydrated] = useState(false);

  // Get the current city configuration
  const city = getCityOrDefault(cityId);
  const enabledCities = getEnabledCities();

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedCityId = localStorage.getItem(CITY_STORAGE_KEY);
    if (storedCityId && CITIES[storedCityId]) {
      setCityId(storedCityId);
    }
    setIsHydrated(true);
  }, []);

  // Apply theme CSS variables when city changes
  useEffect(() => {
    if (!isHydrated) return;

    const root = document.documentElement;
    
    // Set data-city attribute for CSS targeting
    root.setAttribute('data-city', city.id);

    // Apply CSS custom properties
    const themeVars = getCityThemeVars(city);
    Object.entries(themeVars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Clean up function to remove styles if needed
    return () => {
      root.removeAttribute('data-city');
    };
  }, [city, isHydrated]);

  // Handler to change the selected city
  const setCity = useCallback((newCityId: string) => {
    if (!CITIES[newCityId]) {
      console.warn(`City "${newCityId}" not found, using default`);
      newCityId = DEFAULT_CITY_ID;
    }

    setCityId(newCityId);
    localStorage.setItem(CITY_STORAGE_KEY, newCityId);
  }, []);

  const value: CityContextValue = {
    city,
    cityId,
    setCity,
    enabledCities,
    isHydrated,
  };

  return (
    <CityContext.Provider value={value}>
      {children}
    </CityContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useCity - Hook to access the city context
 * 
 * @returns The city context value
 * @throws Error if used outside of CityProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { city, setCity, enabledCities } = useCity();
 *   
 *   return (
 *     <select value={city.id} onChange={(e) => setCity(e.target.value)}>
 *       {enabledCities.map((c) => (
 *         <option key={c.id} value={c.id}>{c.name}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useCity(): CityContextValue {
  const context = useContext(CityContext);
  
  if (context === undefined) {
    throw new Error('useCity must be used within a CityProvider');
  }
  
  return context;
}

// ============================================================================
// Exports
// ============================================================================

export { CityContext };
export type { CityContextValue, CityProviderProps };

