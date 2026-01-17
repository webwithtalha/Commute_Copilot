"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTheme } from "next-themes";
import { useMapsStore, type MapStyle } from "@/store";
import { useCity } from "@/context";
import { MapControls } from "./map-controls";
import { MapsPanel } from "./maps-panel";
import type { Stop } from "@/types/tfl";

// MapLibre types
import type maplibregl from "maplibre-gl";

const SEARCH_RADIUS = 500; // meters

// Map style URLs
const MAP_STYLES: Record<MapStyle, { light: string; dark: string }> = {
  default: {
    light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  streets: {
    light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  satellite: {
    light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
};

export function MapView() {
  const { theme, resolvedTheme } = useTheme();
  const { city } = useCity();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const circleLayerAddedRef = useRef(false);

  const [mapLibre, setMapLibre] = useState<typeof maplibregl | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const {
    userLocation,
    setUserLocation,
    isLocating,
    setIsLocating,
    locationError,
    setLocationError,
    nearbyStops,
    setNearbyStops,
    isLoadingStops,
    setIsLoadingStops,
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    mapStyle,
    selectedStopId,
    setSelectedStopId,
    isPanelVisible,
  } = useMapsStore();

  const currentTheme = resolvedTheme || theme || "light";
  const isDark = currentTheme === "dark";

  // Get current map style URL
  const getStyleUrl = useCallback(() => {
    const styleConfig = MAP_STYLES[mapStyle] || MAP_STYLES.default;
    return isDark ? styleConfig.dark : styleConfig.light;
  }, [mapStyle, isDark]);

  // Initialize MapLibre dynamically
  useEffect(() => {
    const loadMapLibre = async () => {
      // Load MapLibre GL CSS
      if (!document.querySelector('link[href*="maplibre-gl.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.css';
        document.head.appendChild(link);
      }

      const ml = await import("maplibre-gl");
      setMapLibre(ml.default);
    };
    loadMapLibre();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLibre || !mapContainerRef.current || mapRef.current) return;

    console.log('Initializing map...', {
      container: mapContainerRef.current,
      containerSize: {
        width: mapContainerRef.current.clientWidth,
        height: mapContainerRef.current.clientHeight
      },
      style: getStyleUrl()
    });

    const map = new mapLibre.Map({
      container: mapContainerRef.current,
      style: getStyleUrl(),
      center: [mapCenter[1], mapCenter[0]], // MapLibre uses [lng, lat]
      zoom: mapZoom,
      attributionControl: false,
    });

    map.on('error', (e) => {
      console.error('Map error:', e);
    });

    map.addControl(
      new mapLibre.AttributionControl({ compact: true }),
      "bottom-left"
    );

    map.on("load", () => {
      setMapReady(true);
    });

    map.on("moveend", () => {
      const center = map.getCenter();
      setMapCenter([center.lat, center.lng]);
      setMapZoom(map.getZoom());
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [mapLibre]);

  // Update map style when theme or style changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    mapRef.current.setStyle(getStyleUrl());
    circleLayerAddedRef.current = false;
  }, [getStyleUrl, mapReady]);

  // Fetch nearby stops
  const fetchNearbyStops = useCallback(async (lat: number, lon: number) => {
    setIsLoadingStops(true);
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        radius: SEARCH_RADIUS.toString(),
        city: city.id,
      });

      const response = await fetch(`/api/transit/stops/nearby?${params}`);
      const data = await response.json();

      if (data.success && data.data) {
        setNearbyStops(data.data);
      } else {
        setNearbyStops([]);
      }
    } catch (error) {
      console.error("Failed to fetch nearby stops:", error);
      setNearbyStops([]);
    } finally {
      setIsLoadingStops(false);
    }
  }, [city.id, setNearbyStops, setIsLoadingStops]);

  // Handle search for a specific location (postcode, city, etc.)
  const handleSearchLocation = useCallback((lat: number, lon: number, name: string) => {
    // Update the user location to the searched location
    setUserLocation({ lat, lon, accuracy: 0 });
    setMapCenter([lat, lon]);

    // Fetch nearby stops for this location
    fetchNearbyStops(lat, lon);

    // Fly to the location
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lon, lat],
        zoom: 15,
        duration: 1500,
      });
    }
  }, [fetchNearbyStops, setUserLocation, setMapCenter]);

  // Handle location request
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude, accuracy });
        setMapCenter([latitude, longitude]);
        setIsLocating(false);

        // Fetch nearby stops
        fetchNearbyStops(latitude, longitude);

        // Center map
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 1500,
          });
        }
      },
      (error) => {
        let message = "Failed to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location unavailable";
            break;
          case error.TIMEOUT:
            message = "Location request timed out";
            break;
        }
        setLocationError(message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [fetchNearbyStops, setUserLocation, setMapCenter, setIsLocating, setLocationError]);

  // Update user marker
  useEffect(() => {
    if (!mapLibre || !mapRef.current || !mapReady || !userLocation) return;

    // Remove old marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    // Create user marker element
    const el = document.createElement("div");
    el.className = "user-marker";
    el.innerHTML = `
      <div style="
        width: 24px;
        height: 24px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
      ">
        <div style="
          position: absolute;
          inset: -8px;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
      </div>
    `;

    userMarkerRef.current = new mapLibre.Marker({ element: el })
      .setLngLat([userLocation.lon, userLocation.lat])
      .addTo(mapRef.current);

    // Add/update search radius circle
    const map = mapRef.current;
    const loc = userLocation; // Capture for closure

    map.on("style.load", () => {
      addCircleLayer();
    });

    if (map.isStyleLoaded()) {
      addCircleLayer();
    }

    function addCircleLayer() {
      if (!loc) return;

      if (circleLayerAddedRef.current) {
        // Update existing circle
        const source = map.getSource("search-radius") as maplibregl.GeoJSONSource;
        if (source) {
          source.setData(createCircleGeoJSON(loc.lat, loc.lon, SEARCH_RADIUS));
        }
        return;
      }

      // Add new circle
      if (!map.getSource("search-radius")) {
        map.addSource("search-radius", {
          type: "geojson",
          data: createCircleGeoJSON(loc.lat, loc.lon, SEARCH_RADIUS),
        });
      }

      if (!map.getLayer("search-radius-fill")) {
        map.addLayer({
          id: "search-radius-fill",
          type: "fill",
          source: "search-radius",
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.1,
          },
        });
      }

      if (!map.getLayer("search-radius-line")) {
        map.addLayer({
          id: "search-radius-line",
          type: "line",
          source: "search-radius",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
            "line-opacity": 0.5,
          },
        });
      }

      circleLayerAddedRef.current = true;
    }
  }, [mapLibre, mapReady, userLocation]);

  // Update stop markers
  useEffect(() => {
    if (!mapLibre || !mapRef.current || !mapReady) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add markers for each stop
    nearbyStops.forEach((stop) => {
      if (!stop.lat || !stop.lon) return;

      const el = document.createElement("div");
      el.className = "stop-marker";
      const isSelected = stop.naptanId === selectedStopId;

      const markerSize = isSelected ? 40 : 32;

      el.innerHTML = `
        <div style="
          width: ${markerSize}px;
          height: ${markerSize}px;
          background: ${isSelected ? "#3b82f6" : "#22c55e"};
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: all 0.2s;
          transform: ${isSelected ? "scale(1.1)" : "scale(1)"};
        ">
          <span style="font-size: ${isSelected ? "18px" : "14px"};">🚌</span>
        </div>
      `;

      el.addEventListener("click", () => {
        setSelectedStopId(stop.naptanId);
      });

      const marker = new mapLibre.Marker({ element: el })
        .setLngLat([stop.lon, stop.lat])
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });
  }, [mapLibre, mapReady, nearbyStops, selectedStopId, setSelectedStopId]);

  // Map control handlers
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleResetView = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo({
        center: [userLocation.lon, userLocation.lat],
        zoom: 15,
        duration: 1000,
      });
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen">
      {/* Map container - full screen */}
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Mini header for map view - compact branding */}
      <div className="absolute top-3 left-3 z-[1001] pointer-events-none sm:hidden">
        <div className="pointer-events-auto">
          <a href="/" className="flex items-center gap-1.5 bg-background/95 backdrop-blur px-3 py-1.5 rounded-full shadow-lg border">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
              CC
            </div>
          </a>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden sm:block absolute top-0 left-0 right-0 z-[1001] pointer-events-none">
        <div className="flex items-center justify-between p-4">
          {/* Left spacer for panel */}
          <div className="w-[380px]" />

          {/* Center - App name */}
          <div className="pointer-events-auto">
            <a href="/" className="flex items-center gap-2 bg-background/95 backdrop-blur px-4 py-2 rounded-full shadow-lg border">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                CC
              </div>
              <span className="font-semibold text-foreground">Commute Copilot</span>
            </a>
          </div>

          {/* Right - empty for balance */}
          <div className="w-[100px]" />
        </div>
      </div>

      {/* Side panel - overlay on top of map */}
      <MapsPanel onLocate={handleLocate} onSearchLocation={handleSearchLocation} />

      {/* Map controls - always on right side */}
      <MapControls
        onLocate={handleLocate}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        currentZoom={mapZoom}
      />

      {/* Error toast - positioned above mobile sheet */}
      {locationError && (
        <div className="absolute bottom-[calc(45vh+16px)] sm:bottom-4 left-1/2 -translate-x-1/2 z-[1002] bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg text-sm">
          {locationError}
        </div>
      )}

      {/* Pulse animation style */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// Helper function to create a GeoJSON circle
function createCircleGeoJSON(
  lat: number,
  lng: number,
  radiusInMeters: number,
  points: number = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const km = radiusInMeters / 1000;

  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = km * Math.cos(angle);
    const dy = km * Math.sin(angle);

    const latitude = lat + (dy / 111.32);
    const longitude = lng + (dx / (111.32 * Math.cos((lat * Math.PI) / 180)));

    coords.push([longitude, latitude]);
  }

  coords.push(coords[0]); // Close the polygon

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}
