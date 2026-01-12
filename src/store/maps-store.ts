/**
 * Maps Store - State management for the map view
 * Adapted from Square UI Maps template
 */

import { create } from 'zustand';
import type { Stop } from '@/types/tfl';

export type MapStyle = 'default' | 'streets' | 'satellite';
export type SortBy = 'nearest' | 'alpha-az' | 'alpha-za';

interface UserLocation {
  lat: number;
  lon: number;
  accuracy?: number;
}

interface MapsState {
  // User location
  userLocation: UserLocation | null;
  isLocating: boolean;
  locationError: string | null;

  // Nearby stops
  nearbyStops: Stop[];
  isLoadingStops: boolean;

  // Map state
  mapCenter: [number, number];
  mapZoom: number;
  mapStyle: MapStyle;

  // UI state
  isPanelVisible: boolean;
  selectedStopId: string | null;
  searchQuery: string;
  sortBy: SortBy;

  // Actions
  setUserLocation: (location: UserLocation | null) => void;
  setIsLocating: (isLocating: boolean) => void;
  setLocationError: (error: string | null) => void;
  setNearbyStops: (stops: Stop[]) => void;
  setIsLoadingStops: (isLoading: boolean) => void;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  setMapStyle: (style: MapStyle) => void;
  setIsPanelVisible: (visible: boolean) => void;
  setSelectedStopId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: SortBy) => void;

  // Computed
  getFilteredStops: () => Stop[];
  getSortedStops: () => Stop[];
}

// Haversine distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Default center (London)
const DEFAULT_CENTER: [number, number] = [51.5074, -0.1278];
const DEFAULT_ZOOM = 14;

export const useMapsStore = create<MapsState>((set, get) => ({
  // Initial state
  userLocation: null,
  isLocating: false,
  locationError: null,
  nearbyStops: [],
  isLoadingStops: false,
  mapCenter: DEFAULT_CENTER,
  mapZoom: DEFAULT_ZOOM,
  mapStyle: 'default',
  isPanelVisible: true,
  selectedStopId: null,
  searchQuery: '',
  sortBy: 'nearest',

  // Actions
  setUserLocation: (location) => set({ userLocation: location }),
  setIsLocating: (isLocating) => set({ isLocating }),
  setLocationError: (error) => set({ locationError: error }),
  setNearbyStops: (stops) => set({ nearbyStops: stops }),
  setIsLoadingStops: (isLoading) => set({ isLoadingStops: isLoading }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  setMapStyle: (style) => set({ mapStyle: style }),
  setIsPanelVisible: (visible) => set({ isPanelVisible: visible }),
  setSelectedStopId: (id) => set({ selectedStopId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),

  // Computed - filtered by search
  getFilteredStops: () => {
    const { nearbyStops, searchQuery } = get();
    if (!searchQuery.trim()) return nearbyStops;

    const query = searchQuery.toLowerCase();
    return nearbyStops.filter(stop =>
      stop.name.toLowerCase().includes(query) ||
      stop.stopCode?.toLowerCase().includes(query) ||
      stop.stopLetter?.toLowerCase().includes(query) ||
      stop.lines?.some(line => line.toLowerCase().includes(query))
    );
  },

  // Computed - sorted stops
  getSortedStops: () => {
    const { sortBy, userLocation } = get();
    const filteredStops = get().getFilteredStops();

    const sorted = [...filteredStops];

    switch (sortBy) {
      case 'nearest':
        if (userLocation) {
          sorted.sort((a, b) => {
            const distA = calculateDistance(userLocation.lat, userLocation.lon, a.lat, a.lon);
            const distB = calculateDistance(userLocation.lat, userLocation.lon, b.lat, b.lon);
            return distA - distB;
          });
        }
        break;
      case 'alpha-az':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'alpha-za':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return sorted;
  },
}));

// Helper to calculate distance for display
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function getDistanceFromUser(stop: Stop, userLocation: UserLocation | null): number | null {
  if (!userLocation) return null;
  return calculateDistance(userLocation.lat, userLocation.lon, stop.lat, stop.lon);
}
