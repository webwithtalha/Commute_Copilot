"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  MapPin,
  ArrowUpDown,
  Loader2,
  Navigation,
  PanelLeftClose,
  PanelLeft,
  MapPinned,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMapsStore, type SortBy } from "@/store";
import { StopCard } from "./stop-card";
import { cn } from "@/lib/utils";

const sortOptions: { value: SortBy; label: string }[] = [
  { value: "nearest", label: "Nearest first" },
  { value: "alpha-az", label: "A to Z" },
  { value: "alpha-za", label: "Z to A" },
];

interface GeocodingResult {
  lat: number;
  lon: number;
  displayName: string;
  address?: {
    road?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
}

interface MapsPanelProps {
  onLocate?: () => void;
  onSearchLocation?: (lat: number, lon: number, name: string) => void;
}

export function MapsPanel({ onLocate, onSearchLocation }: MapsPanelProps) {
  const router = useRouter();
  const {
    isPanelVisible,
    setIsPanelVisible,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    selectedStopId,
    setSelectedStopId,
    userLocation,
    isLocating,
    isLoadingStops,
    getSortedStops,
  } = useMapsStore();

  // Location search state
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<GeocodingResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationResults, setShowLocationResults] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<string | null>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sortedStops = getSortedStops();
  const selectedStop = sortedStops.find((s) => s.naptanId === selectedStopId);

  // Debounced location search
  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setLocationResults([]);
      setShowLocationResults(false);
      return;
    }

    setIsSearchingLocation(true);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.success && data.data) {
        setLocationResults(data.data);
        setShowLocationResults(true);
      } else {
        setLocationResults([]);
      }
    } catch (error) {
      console.error("Location search failed:", error);
      setLocationResults([]);
    } finally {
      setIsSearchingLocation(false);
    }
  }, []);

  // Handle location input change with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (locationQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocation(locationQuery);
      }, 300);
    } else {
      setLocationResults([]);
      setShowLocationResults(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [locationQuery, searchLocation]);

  // Handle selecting a location from results
  const handleSelectLocation = (result: GeocodingResult) => {
    setLocationQuery("");
    setShowLocationResults(false);
    setLocationResults([]);

    // Format display name (shorter version)
    const shortName = result.address?.city ||
      result.address?.postcode ||
      result.displayName.split(",")[0];

    setSearchedLocation(shortName);
    onSearchLocation?.(result.lat, result.lon, shortName);
  };

  // Clear searched location
  const clearSearchedLocation = () => {
    setSearchedLocation(null);
    setLocationQuery("");
  };

  const handleStopClick = (stopId: string) => {
    if (selectedStopId === stopId) {
      router.push(`/stop/${encodeURIComponent(stopId)}`);
    } else {
      setSelectedStopId(stopId);
    }
  };

  const handleViewDetails = () => {
    if (selectedStopId) {
      router.push(`/stop/${encodeURIComponent(selectedStopId)}`);
    }
  };

  // Panel toggle button (shown when panel is hidden on desktop)
  if (!isPanelVisible) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsPanelVisible(true)}
        className="absolute top-4 left-4 z-[1000] bg-background/95 backdrop-blur shadow-lg hidden sm:flex"
      >
        <PanelLeft className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className={cn(
      "z-[1000]",
      // Mobile: bottom sheet style
      "fixed inset-x-0 bottom-0 h-[60vh] max-h-[80vh]",
      // Desktop: floating sidebar overlay with full height
      "sm:absolute sm:top-4 sm:left-4 sm:bottom-4 sm:h-auto sm:max-h-none sm:w-[360px] md:w-[380px]",
      "bg-background/95 backdrop-blur-md",
      "border sm:rounded-xl shadow-2xl",
      "flex flex-col overflow-hidden"
    )}>
      {/* Mobile drag handle */}
      <div className="sm:hidden flex justify-center pt-2 pb-1">
        <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
      </div>

      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg text-foreground">
              {searchedLocation ? `Stops near ${searchedLocation}` : "Nearby Stops"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {sortedStops.length} stops found
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPanelVisible(false)}
            className="h-8 w-8 hidden sm:flex"
          >
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Location Search */}
      <div className="px-4 py-3 border-b">
        <div className="relative">
          <MapPinned className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={locationInputRef}
            placeholder="Search location, postcode, city..."
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            onFocus={() => locationResults.length > 0 && setShowLocationResults(true)}
            className="pl-9 pr-9"
          />
          {(locationQuery || isSearchingLocation) && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {isSearchingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setLocationQuery("");
                    setShowLocationResults(false);
                  }}
                  className="h-6 w-6"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}

          {/* Location search results dropdown */}
          {showLocationResults && locationResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-64 overflow-auto">
              {locationResults.map((result, index) => (
                <button
                  key={`${result.lat}-${result.lon}-${index}`}
                  onClick={() => handleSelectLocation(result)}
                  className="w-full px-3 py-2 text-left hover:bg-accent flex items-start gap-2 border-b last:border-b-0"
                >
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {result.address?.city || result.address?.postcode || result.displayName.split(",")[0]}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {result.displayName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Searched location indicator */}
        {searchedLocation && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-primary/10 rounded-lg">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground flex-1 truncate">
              Showing stops near <strong>{searchedLocation}</strong>
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSearchedLocation}
              className="h-6 w-6"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Filter and Sort */}
      <div className="px-4 py-3 border-b space-y-2">
        {/* Filter stops search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter stops, lines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Sort and Locate */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <ArrowUpDown className="w-3 h-3 mr-2" />
                {sortOptions.find((o) => o.value === sortBy)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={cn(sortBy === option.value && "bg-accent")}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Locate button */}
          <Button
            variant={userLocation && !searchedLocation ? "default" : "secondary"}
            size="sm"
            onClick={() => {
              clearSearchedLocation();
              onLocate?.();
            }}
            disabled={isLocating}
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Navigation className="w-4 h-4 mr-2" />
                Locate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content - scrollable area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        <div className="space-y-2 pb-6">
          {/* Loading state */}
          {isLoadingStops && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Finding stops...
            </div>
          )}

          {/* No location state */}
          {!userLocation && !searchedLocation && !isLocating && !isLoadingStops && (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-medium text-foreground mb-1">Find nearby stops</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Search for a location or enable GPS to discover bus stops
              </p>
              <Button onClick={onLocate} disabled={isLocating}>
                <Navigation className="w-4 h-4 mr-2" />
                Use my location
              </Button>
            </div>
          )}

          {/* Empty state */}
          {(userLocation || searchedLocation) && !isLoadingStops && sortedStops.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-medium text-foreground mb-1">No stops found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "No bus stops found in this area"}
              </p>
            </div>
          )}

          {/* Selected stop expanded card */}
          {selectedStop && (
            <div className="mb-3">
              <StopCard
                stop={selectedStop}
                isExpanded={true}
                onClick={handleViewDetails}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStopId(null)}
                className="w-full mt-2"
              >
                <X className="w-3 h-3 mr-2" />
                Close
              </Button>
            </div>
          )}

          {/* Stop list */}
          {sortedStops
            .filter((stop) => stop.naptanId !== selectedStopId)
            .map((stop) => (
              <StopCard
                key={stop.naptanId}
                stop={stop}
                isSelected={false}
                onClick={() => handleStopClick(stop.naptanId)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
