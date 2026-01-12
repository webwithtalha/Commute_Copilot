"use client";

import { cn } from "@/lib/utils";
import { ArrivalItem, ArrivalItemSkeleton } from "./arrival-item";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Clock } from "lucide-react";
import type { Arrival } from "@/types/tfl";
import { useCity } from "@/context/city-context";

interface ArrivalsListProps {
  /** List of arrivals */
  arrivals: Arrival[];
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Whether data is refreshing (showing stale data) */
  isRefreshing?: boolean;
  /** Last update timestamp */
  lastUpdated?: Date;
  /** Auto-refresh interval in seconds (for display) */
  refreshInterval?: number;
  /** Error message if any */
  error?: string;
  /** Retry callback for error state */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Container component for displaying live arrivals.
 * Includes auto-refresh indicator and loading/error states.
 */
export function ArrivalsList({
  arrivals,
  isLoading = false,
  isRefreshing = false,
  lastUpdated,
  refreshInterval = 15,
  error,
  onRetry,
  className,
}: ArrivalsListProps) {
  const { cityId } = useCity();
  const isOutsideLondon = cityId === 'outside-london';

  // Show loading skeletons
  if (isLoading && arrivals.length === 0) {
    return (
      <div className={cn("space-y-3", className)} role="status" aria-label="Loading arrivals">
        <ArrivalsListHeader
          isRefreshing={false}
          refreshInterval={refreshInterval}
        />
        {[...Array(4)].map((_, i) => (
          <ArrivalItemSkeleton key={i} />
        ))}
        <span className="sr-only">Loading live arrivals...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={cn("space-y-3", className)} role="alert">
        <ArrivalsListHeader
          isRefreshing={false}
          refreshInterval={refreshInterval}
        />
        <div className="flex flex-col items-center justify-center py-10 sm:py-12 text-center animate-in fade-in duration-300">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-destructive" />
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 max-w-xs">
            {error || "Couldn't load arrivals. Please try again."}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-2"
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Retrying..." : "Try again"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Show empty state
  if (arrivals.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <ArrivalsListHeader
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          refreshInterval={refreshInterval}
          onManualRefresh={onRetry}
          isOutsideLondon={isOutsideLondon}
        />
        <div className="flex flex-col items-center justify-center py-10 sm:py-12 text-center animate-in fade-in duration-300">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
          </div>
          <p className="text-base sm:text-lg font-medium text-foreground">
            No buses nearby
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs">
            {isOutsideLondon
              ? "No buses detected heading to this stop. Check back shortly."
              : "Check back later for live departure times"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} aria-live="polite">
      <ArrivalsListHeader
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        refreshInterval={refreshInterval}
        onManualRefresh={onRetry}
      />
      <div className="space-y-2">
        {arrivals.map((arrival, index) => (
          <div
            key={arrival.id}
            className="animate-in fade-in slide-in-from-left-2 duration-200"
            style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
          >
            <ArrivalItem arrival={arrival} />
          </div>
        ))}
      </div>
      
      {/* Helpful hint for when arrivals are shown */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        {isOutsideLondon
          ? `Estimated arrivals based on nearby bus positions. Updates every ${refreshInterval}s`
          : `Live data updates automatically every ${refreshInterval} seconds`}
      </p>
    </div>
  );
}

interface ArrivalsListHeaderProps {
  isRefreshing?: boolean;
  lastUpdated?: Date;
  refreshInterval?: number;
  onManualRefresh?: () => void;
  isOutsideLondon?: boolean;
}

function ArrivalsListHeader({
  isRefreshing,
  lastUpdated,
  refreshInterval = 15,
  onManualRefresh,
  isOutsideLondon = false,
}: ArrivalsListHeaderProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-base sm:text-lg text-foreground">
          {isOutsideLondon ? "Nearby Buses" : "Live Arrivals"}
        </h2>
        {/* Live indicator dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tfl-green opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-tfl-green"></span>
        </span>
      </div>

      <button
        onClick={onManualRefresh}
        disabled={isRefreshing}
        className={cn(
          "flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground",
          "hover:text-foreground transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "tap-highlight-transparent select-none-touch"
        )}
        aria-label={isRefreshing ? "Refreshing arrivals" : "Refresh arrivals"}
      >
        <RefreshCw
          className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isRefreshing && "animate-spin")}
          aria-hidden="true"
        />
        <span>
          {isRefreshing ? "Updating..." : `↻ ${refreshInterval}s`}
        </span>
      </button>
    </div>
  );
}

