"use client";

import { cn } from "@/lib/utils";

interface CountdownProps {
  /** Time remaining in seconds */
  timeInSeconds: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show "Due" instead of "0 min" when bus is arriving */
  showDue?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: "text-base sm:text-lg",
  md: "text-xl sm:text-2xl",
  lg: "text-2xl sm:text-3xl",
};

const labelSizeClasses = {
  sm: "text-xs",
  md: "text-xs sm:text-sm",
  lg: "text-sm",
};

/**
 * Countdown display for arrival times.
 * Shows minutes remaining with clear, bold styling.
 */
export function Countdown({
  timeInSeconds,
  size = "md",
  showDue = true,
  className,
}: CountdownProps) {
  const minutes = Math.floor(timeInSeconds / 60);

  // Show "Due" for arrivals within 1 minute
  if (showDue && minutes < 1) {
    return (
      <div 
        className={cn("text-right", className)}
        aria-label="Arriving now"
      >
        <span
          className={cn(
            "font-bold tabular-nums text-tfl-green animate-pulse",
            sizeClasses[size]
          )}
        >
          Due
        </span>
      </div>
    );
  }

  return (
    <div 
      className={cn("text-right flex items-baseline justify-end gap-0.5 sm:gap-1", className)}
      aria-label={`${minutes} minute${minutes !== 1 ? 's' : ''}`}
    >
      <span
        className={cn(
          "font-bold tabular-nums text-foreground",
          sizeClasses[size]
        )}
      >
        {minutes}
      </span>
      <span className={cn("text-muted-foreground", labelSizeClasses[size])}>
        min
      </span>
    </div>
  );
}

/**
 * Calculate minutes from now until expected arrival
 */
export function getMinutesUntil(expectedArrival: Date | string): number {
  const arrival = new Date(expectedArrival);
  const now = new Date();
  const diffMs = arrival.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / 1000 / 60));
}

