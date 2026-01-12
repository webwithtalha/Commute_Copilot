"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Stop } from "@/types/tfl";

// Storage key for localStorage
const STORAGE_KEY = "commute-copilot-favorites";

// Favorite stop with metadata
export interface FavoriteStop {
  id: string;
  naptanId: string;
  name: string;
  stopLetter?: string;
  stopCode?: string;
  lat: number;
  lon: number;
  lines: string[];
  addedAt: string;
}

// Context value type
interface FavoritesContextValue {
  favorites: FavoriteStop[];
  isFavorite: (stopId: string) => boolean;
  addFavorite: (stop: Stop) => void;
  removeFavorite: (stopId: string) => void;
  toggleFavorite: (stop: Stop) => void;
  clearFavorites: () => void;
  isHydrated: boolean;
}

// Create context
const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined
);

// Provider component
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteStop[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavorites(parsed);
        }
      }
    } catch (error) {
      console.error("[Favorites] Failed to load from localStorage:", error);
    }
    setIsHydrated(true);
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
      } catch (error) {
        console.error("[Favorites] Failed to save to localStorage:", error);
      }
    }
  }, [favorites, isHydrated]);

  // Check if a stop is in favorites
  const isFavorite = useCallback(
    (stopId: string) => {
      return favorites.some((f) => f.id === stopId || f.naptanId === stopId);
    },
    [favorites]
  );

  // Add a stop to favorites
  const addFavorite = useCallback((stop: Stop) => {
    const newFavorite: FavoriteStop = {
      id: stop.id,
      naptanId: stop.naptanId,
      name: stop.name,
      stopLetter: stop.stopLetter,
      stopCode: stop.stopCode,
      lat: stop.lat,
      lon: stop.lon,
      lines: stop.lines || [],
      addedAt: new Date().toISOString(),
    };

    setFavorites((prev) => {
      // Don't add if already exists
      if (prev.some((f) => f.id === stop.id)) {
        return prev;
      }
      return [newFavorite, ...prev];
    });
  }, []);

  // Remove a stop from favorites
  const removeFavorite = useCallback((stopId: string) => {
    setFavorites((prev) =>
      prev.filter((f) => f.id !== stopId && f.naptanId !== stopId)
    );
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback(
    (stop: Stop) => {
      if (isFavorite(stop.id)) {
        removeFavorite(stop.id);
      } else {
        addFavorite(stop);
      }
    },
    [isFavorite, addFavorite, removeFavorite]
  );

  // Clear all favorites
  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        addFavorite,
        removeFavorite,
        toggleFavorite,
        clearFavorites,
        isHydrated,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

// Hook to use favorites context
export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
