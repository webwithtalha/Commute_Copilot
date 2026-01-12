"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SearchInput, StopCard, StopCardSkeleton, ErrorState } from "@/components";
import { useSearch } from "@/hooks";
import { useRecents } from "@/context";
import { MapPin, Search } from "lucide-react";
import type { Stop } from "@/types/tfl";

export function SearchView() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { addRecent } = useRecents();

  const { stops, isLoading, isDebouncing, debouncedQuery, error, refetch } = useSearch(
    query,
    {
      debounceMs: 300,
      modes: "bus",
      maxResults: 15,
    }
  );

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleStopClick = useCallback((stopId: string, stop: Stop) => {
    addRecent(stop);
    router.push(`/stop/${encodeURIComponent(stopId)}`);
  }, [router, addRecent]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const showResults = debouncedQuery.length >= 2;
  const showLoading = (isLoading || isDebouncing) && showResults;
  const showEmpty = showResults && !isLoading && stops.length === 0 && !error;
  const showStops = showResults && stops.length > 0;

  const getErrorType = () => {
    if (!navigator.onLine) return "network" as const;
    return "generic" as const;
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Hero Section */}
      <section className="mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">
          Where are you going?
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Search for bus stops by name or enter a 5-digit stop code
        </p>
      </section>

      {/* Search Section */}
      <section className="mb-6">
        <SearchInput
          onSearch={handleSearch}
          isLoading={showLoading}
          placeholder="Search stops or enter stop code..."
          autoFocus
          className="w-full"
        />
      </section>

      {/* Results Section */}
      <section className="space-y-4" aria-live="polite" aria-atomic="false">
        {/* Results count */}
        {showStops && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2 animate-in fade-in duration-200">
            <Search className="w-4 h-4" aria-hidden="true" />
            <span>
              {stops.length} stop{stops.length !== 1 ? "s" : ""} found for &quot;{debouncedQuery}&quot;
            </span>
          </div>
        )}

        {/* Loading skeletons */}
        {showLoading && (
          <div className="space-y-3" role="status" aria-label="Loading search results">
            {[...Array(4)].map((_, i) => (
              <StopCardSkeleton key={i} />
            ))}
            <span className="sr-only">Loading search results...</span>
          </div>
        )}

        {/* Stop cards */}
        {showStops && !showLoading && (
          <div className="space-y-3">
            {stops.map((stop, index) => (
              <div
                key={stop.id}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
              >
                <StopCard
                  stop={stop}
                  onClick={() => handleStopClick(stop.naptanId, stop)}
                  className="card-hover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {showEmpty && (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center mb-4 sm:mb-6">
              <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
              No stops found
            </h2>
            <p className="text-muted-foreground max-w-md text-sm sm:text-base">
              We couldn&apos;t find any bus stops matching &quot;{debouncedQuery}&quot;.
              Try a different search term or check the stop code.
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <ErrorState
            type={getErrorType()}
            message={
              getErrorType() === "network"
                ? "Please check your internet connection and try again."
                : "We couldn't search for stops right now. Please try again."
            }
            onRetry={handleRetry}
            isRetrying={isLoading}
          />
        )}

        {/* Initial state - before searching */}
        {!showResults && !showLoading && !error && (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 sm:mb-6">
              <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
              Find your bus stop
            </h2>
            <p className="text-muted-foreground max-w-md text-sm sm:text-base px-4">
              Search for a bus stop by name or location to see live arrivals
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
