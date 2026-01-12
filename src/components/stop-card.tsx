"use client";

import { cn } from "@/lib/utils";
import { StopLetterBadge } from "./stop-letter-badge";
import { FavoriteButton } from "./favorite-button";
import { Badge } from "@/components/ui/badge";
import { Bus, ArrowRight } from "lucide-react";
import { useFavorites } from "@/context";
import type { Stop } from "@/types/tfl";

interface StopCardProps {
  /** Stop data */
  stop: Stop;
  /** Click handler for navigation */
  onClick?: () => void;
  /** Whether the card is in a highlighted state */
  isActive?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the favorite button */
  showFavorite?: boolean;
}

/**
 * Search result card for displaying stop information.
 * Shows stop letter badge, name, code, direction, and favorite button.
 */
export function StopCard({
  stop,
  onClick,
  isActive = false,
  className,
  showFavorite = true,
}: StopCardProps) {
  const hasBus = stop.modes.includes("bus");
  const { isFavorite, toggleFavorite } = useFavorites();
  const stopIsFavorite = isFavorite(stop.id);

  return (
    <div
      className={cn(
        "w-full flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg border text-left",
        "transition-all duration-200 ease-out",
        "hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm",
        isActive && "border-primary bg-primary/5",
        className
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-start gap-3 sm:gap-4 flex-1 min-w-0 text-left",
          "active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "tap-highlight-transparent select-none-touch"
        )}
        aria-label={`${stop.name}${stop.stopCode ? `, Stop code ${stop.stopCode}` : ""}${stop.direction ? `, towards ${stop.direction}` : ""}`}
      >
        <StopLetterBadge letter={stop.stopLetter} size="md" />

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
          {stop.name}
        </h3>

        {/* Stop code or group indicator - prominently displayed */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
          {stop.stopCode ? (
            // Individual stop with 5-digit code
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-md border border-primary/20">
              <span className="text-[10px] sm:text-xs text-primary font-medium uppercase tracking-wide">
                Stop
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-primary tracking-wider">
                {stop.stopCode}
              </span>
            </div>
          ) : stop.isGroup ? (
            // Group stop containing multiple individual stops
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-md border border-border">
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                {stop.childCount ? `${stop.childCount} stops` : "Multiple stops"}
              </span>
            </div>
          ) : stop.stopLetter ? (
            // Individual stop with letter but no code yet
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-md border border-border">
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                Stop {stop.stopLetter}
              </span>
            </div>
          ) : null}

          {stop.direction && (
            <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-0.5 sm:gap-1">
              <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" aria-hidden="true" />
              <span className="truncate max-w-[120px] sm:max-w-none">{stop.direction}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
          {hasBus && (
            <Badge variant="secondary" className="text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-1.5 py-0.5">
              <Bus className="w-2.5 h-2.5 sm:w-3 sm:h-3" aria-hidden="true" />
              Bus
            </Badge>
          )}

          {stop.lines.slice(0, 4).map((line) => (
            <Badge
              key={line}
              variant="outline"
              className="text-[10px] sm:text-xs bg-muted/50 px-1.5 py-0.5"
            >
              {line}
            </Badge>
          ))}

          {stop.lines.length > 4 && (
            <Badge variant="outline" className="text-[10px] sm:text-xs bg-muted/50 px-1.5 py-0.5">
              +{stop.lines.length - 4}
            </Badge>
          )}
        </div>
      </div>

        <ArrowRight
          className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-1"
          aria-hidden="true"
        />
      </button>

      {showFavorite && (
        <FavoriteButton
          isFavorite={stopIsFavorite}
          onToggle={() => toggleFavorite(stop)}
          size="sm"
          className="flex-shrink-0 mt-0.5"
        />
      )}
    </div>
  );
}

interface StopCardSkeletonProps {
  className?: string;
}

/**
 * Skeleton loader for StopCard
 */
export function StopCardSkeleton({ className }: StopCardSkeletonProps) {
  return (
    <div
      className={cn(
        "w-full flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg border",
        className
      )}
      aria-hidden="true"
    >
      {/* Stop letter badge skeleton */}
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted animate-pulse flex-shrink-0" />

      {/* Text content skeleton */}
      <div className="flex-1 space-y-2 sm:space-y-3">
        <div className="h-4 sm:h-5 bg-muted animate-pulse rounded w-2/3" />
        <div className="h-3 sm:h-4 bg-muted animate-pulse rounded w-1/2" />
        <div className="flex gap-1.5 sm:gap-2">
          <div className="h-4 sm:h-5 w-10 sm:w-12 bg-muted animate-pulse rounded" />
          <div className="h-4 sm:h-5 w-7 sm:w-8 bg-muted animate-pulse rounded" />
          <div className="h-4 sm:h-5 w-7 sm:w-8 bg-muted animate-pulse rounded" />
        </div>
      </div>

      {/* Arrow skeleton */}
      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-muted animate-pulse rounded flex-shrink-0" />
    </div>
  );
}

