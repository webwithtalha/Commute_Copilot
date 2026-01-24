"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SearchInput, StopCard, StopCardSkeleton } from "@/components";
import { useSearch } from "@/hooks";
import { useFavorites } from "@/context";
import { MapPin, Star, Search } from "lucide-react";
import type { Stop } from "@/types/tfl";

interface DestinationPickerProps {
  onSelect: (stop: Stop) => void;
  className?: string;
}

/**
 * Destination picker component for selecting a bus stop
 * Includes search functionality and quick access to favorites
 */
export function DestinationPicker({ onSelect, className }: DestinationPickerProps) {
  const [query, setQuery] = useState("");
  const { favorites } = useFavorites();

  const { stops, isLoading, isDebouncing, debouncedQuery } = useSearch(query, {
    debounceMs: 300,
    modes: "bus",
    maxResults: 10,
  });

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleStopSelect = useCallback(
    (stop: Stop) => {
      onSelect(stop);
    },
    [onSelect]
  );

  const showResults = debouncedQuery.length >= 2;
  const showLoading = (isLoading || isDebouncing) && showResults;
  const showEmpty = showResults && !isLoading && stops.length === 0;
  const showStops = showResults && stops.length > 0 && !isLoading;
  const showFavorites = !showResults && favorites.length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search input */}
      <div>
        <SearchInput
          onSearch={handleSearch}
          isLoading={showLoading}
          placeholder="Search for your destination stop..."
          autoFocus
          className="w-full"
        />
      </div>

      {/* Search results */}
      {showLoading && (
        <div className="space-y-3" role="status" aria-label="Loading search results">
          {[...Array(3)].map((_, i) => (
            <StopCardSkeleton key={i} />
          ))}
        </div>
      )}

      {showStops && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="w-4 h-4" aria-hidden="true" />
            <span>
              {stops.length} stop{stops.length !== 1 ? "s" : ""} found
            </span>
          </div>
          {stops.map((stop, index) => (
            <div
              key={stop.id}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
            >
              <StopCard
                stop={stop}
                onClick={() => handleStopSelect(stop)}
                showFavorite={false}
                className="cursor-pointer"
              />
            </div>
          ))}
        </div>
      )}

      {showEmpty && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <MapPin className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No stops found for &quot;{debouncedQuery}&quot;
          </p>
        </div>
      )}

      {/* Favorites section */}
      {showFavorites && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Star className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span>Your favorite stops</span>
          </div>
          {favorites.slice(0, 5).map((fav, index) => (
            <div
              key={fav.id}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
            >
              <button
                type="button"
                onClick={() =>
                  handleStopSelect({
                    id: fav.id,
                    naptanId: fav.naptanId,
                    name: fav.name,
                    commonName: fav.name,
                    stopLetter: fav.stopLetter,
                    stopCode: fav.stopCode,
                    lat: fav.lat,
                    lon: fav.lon,
                    modes: ["bus"],
                    lines: fav.lines,
                  } as Stop)
                }
                className={cn(
                  "w-full flex items-center gap-3 p-3 bg-card rounded-lg border text-left",
                  "transition-all duration-200 ease-out",
                  "hover:bg-muted/50 hover:border-primary/30"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-amber-500" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{fav.name}</p>
                  {fav.stopCode && (
                    <p className="text-xs text-muted-foreground">
                      Stop {fav.stopCode}
                    </p>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Initial state */}
      {!showResults && !showLoading && favorites.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Where do you need to be?</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Search for your destination bus stop to get personalized departure recommendations
          </p>
        </div>
      )}
    </div>
  );
}
