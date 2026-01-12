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
const STORAGE_KEY = "commute-copilot-recents";

// Maximum number of recent stops to keep
const MAX_RECENTS = 10;

// Recent stop with metadata
export interface RecentStop {
  id: string;
  naptanId: string;
  name: string;
  stopLetter?: string;
  stopCode?: string;
  lat: number;
  lon: number;
  lines: string[];
  viewedAt: string;
}

// Context value type
interface RecentsContextValue {
  recents: RecentStop[];
  addRecent: (stop: Stop) => void;
  removeRecent: (stopId: string) => void;
  clearRecents: () => void;
  isHydrated: boolean;
}

// Create context
const RecentsContext = createContext<RecentsContextValue | undefined>(
  undefined
);

// Provider component
export function RecentsProvider({ children }: { children: ReactNode }) {
  const [recents, setRecents] = useState<RecentStop[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load recents from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecents(parsed);
        }
      }
    } catch (error) {
      console.error("[Recents] Failed to load from localStorage:", error);
    }
    setIsHydrated(true);
  }, []);

  // Save recents to localStorage whenever they change
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
      } catch (error) {
        console.error("[Recents] Failed to save to localStorage:", error);
      }
    }
  }, [recents, isHydrated]);

  // Add a stop to recents (or move to top if already exists)
  const addRecent = useCallback((stop: Stop) => {
    const newRecent: RecentStop = {
      id: stop.id,
      naptanId: stop.naptanId,
      name: stop.name,
      stopLetter: stop.stopLetter,
      stopCode: stop.stopCode,
      lat: stop.lat,
      lon: stop.lon,
      lines: stop.lines || [],
      viewedAt: new Date().toISOString(),
    };

    setRecents((prev) => {
      // Remove if already exists (will be re-added at top)
      const filtered = prev.filter(
        (r) => r.id !== stop.id && r.naptanId !== stop.naptanId
      );

      // Add to top and limit to MAX_RECENTS
      return [newRecent, ...filtered].slice(0, MAX_RECENTS);
    });
  }, []);

  // Remove a stop from recents
  const removeRecent = useCallback((stopId: string) => {
    setRecents((prev) =>
      prev.filter((r) => r.id !== stopId && r.naptanId !== stopId)
    );
  }, []);

  // Clear all recents
  const clearRecents = useCallback(() => {
    setRecents([]);
  }, []);

  return (
    <RecentsContext.Provider
      value={{
        recents,
        addRecent,
        removeRecent,
        clearRecents,
        isHydrated,
      }}
    >
      {children}
    </RecentsContext.Provider>
  );
}

// Hook to use recents context
export function useRecents() {
  const context = useContext(RecentsContext);
  if (context === undefined) {
    throw new Error("useRecents must be used within a RecentsProvider");
  }
  return context;
}
