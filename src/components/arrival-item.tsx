"use client";

import { cn } from "@/lib/utils";
import { LineBadge } from "./line-badge";
import { Countdown } from "./countdown";
import type { Arrival } from "@/types/tfl";

interface ArrivalItemProps {
  /** Arrival data */
  arrival: Arrival;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Single arrival row showing line number, destination, and countdown.
 * Used within the ArrivalsList component.
 */
export function ArrivalItem({ arrival, className }: ArrivalItemProps) {
  const mode = arrival.mode === "bus" ? "bus" : "tube";
  const isImminent = arrival.timeToStation < 60; // Less than 1 minute

  return (
    <article
      className={cn(
        "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg border",
        "transition-all duration-200 ease-out",
        "hover:bg-muted/50 hover:shadow-sm",
        isImminent && "border-tfl-green/30 bg-tfl-green/5",
        className
      )}
      aria-label={`${arrival.lineName} to ${arrival.destination}, arriving in ${Math.floor(arrival.timeToStation / 60)} minutes`}
    >
      <LineBadge lineNumber={arrival.lineName} mode={mode} size="md" />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate text-sm sm:text-base">
          {arrival.destination}
        </p>
        {arrival.currentLocation && (
          <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
            {arrival.currentLocation}
          </p>
        )}
      </div>

      <Countdown 
        timeInSeconds={arrival.timeToStation} 
        size="md"
        className={cn(isImminent && "text-tfl-green")}
      />
    </article>
  );
}

interface ArrivalItemSkeletonProps {
  className?: string;
}

/**
 * Skeleton loader for ArrivalItem
 */
export function ArrivalItemSkeleton({ className }: ArrivalItemSkeletonProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg border",
        className
      )}
      aria-hidden="true"
    >
      {/* Line badge skeleton */}
      <div className="w-8 h-7 sm:w-9 sm:h-8 bg-muted animate-pulse rounded flex-shrink-0" />

      {/* Text content skeleton */}
      <div className="flex-1 space-y-1.5 sm:space-y-2">
        <div className="h-4 sm:h-5 bg-muted animate-pulse rounded w-3/4" />
        <div className="h-3 sm:h-4 bg-muted animate-pulse rounded w-1/2" />
      </div>

      {/* Countdown skeleton */}
      <div className="h-7 sm:h-8 w-14 sm:w-16 bg-muted animate-pulse rounded flex-shrink-0" />
    </div>
  );
}

