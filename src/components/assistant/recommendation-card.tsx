"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Footprints,
  Timer,
  Bus,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
} from "lucide-react";
import type { JourneyRecommendation, JourneySegment, JourneyWarning } from "@/types/assistant";

interface RecommendationCardProps {
  recommendation: JourneyRecommendation;
  isPrimary?: boolean;
  className?: string;
}

/**
 * Format time from ISO string
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get confidence badge variant and color
 */
function getConfidenceBadgeStyle(level: JourneyRecommendation["confidenceLevel"]) {
  switch (level) {
    case "safe":
      return {
        variant: "default" as const,
        className: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20",
      };
    case "moderate":
      return {
        variant: "secondary" as const,
        className: "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20",
      };
    case "tight":
      return {
        variant: "outline" as const,
        className: "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20",
      };
  }
}

/**
 * Get segment icon
 */
function getSegmentIcon(type: JourneySegment["type"]) {
  switch (type) {
    case "walk":
      return Footprints;
    case "wait":
      return Timer;
    case "bus":
      return Bus;
    default:
      return Clock;
  }
}

/**
 * Get warning icon
 */
function getWarningIcon(severity: JourneyWarning["severity"]) {
  switch (severity) {
    case "critical":
      return AlertTriangle;
    case "warning":
      return AlertCircle;
    case "info":
      return Info;
  }
}

/**
 * Get warning color
 */
function getWarningColor(severity: JourneyWarning["severity"]) {
  switch (severity) {
    case "critical":
      return "text-red-500 bg-red-500/10";
    case "warning":
      return "text-amber-500 bg-amber-500/10";
    case "info":
      return "text-blue-500 bg-blue-500/10";
  }
}

/**
 * Card displaying a single journey recommendation
 */
export function RecommendationCard({
  recommendation,
  isPrimary = false,
  className,
}: RecommendationCardProps) {
  const { variant, className: badgeClassName } = getConfidenceBadgeStyle(
    recommendation.confidenceLevel
  );

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-all duration-200",
        isPrimary
          ? "bg-primary/5 border-primary/30 shadow-sm"
          : "bg-card hover:bg-muted/30",
        className
      )}
    >
      {/* Header: Times and confidence */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <span className="font-semibold text-lg">
              Leave at {formatTime(recommendation.departureTime)}
            </span>
          </div>
        </div>

        <Badge
          variant={variant}
          className={cn("text-xs font-medium", badgeClassName)}
        >
          {recommendation.confidenceLevel === "safe" && "Safe"}
          {recommendation.confidenceLevel === "moderate" && "Moderate"}
          {recommendation.confidenceLevel === "tight" && "Tight"}
          {" "}
          {recommendation.confidenceScore}%
        </Badge>
      </div>

      {/* Arrival time and duration */}
      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
        <span>Arrive by {formatTime(recommendation.arrivalTime)}</span>
        <span className="flex items-center gap-1">
          <Timer className="w-3.5 h-3.5" aria-hidden="true" />
          {recommendation.totalDurationMinutes} mins total
        </span>
      </div>

      {/* Journey segments */}
      <div className="flex items-center gap-1 flex-wrap mb-3">
        {recommendation.segments.map((segment, index) => {
          const Icon = getSegmentIcon(segment.type);
          return (
            <div key={index} className="flex items-center gap-1">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
                  segment.type === "bus"
                    ? "bg-primary/10 text-primary font-medium"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="w-3 h-3" aria-hidden="true" />
                {segment.lineName && <span>{segment.lineName}</span>}
                <span>{segment.durationMinutes}m</span>
              </div>
              {index < recommendation.segments.length - 1 && (
                <ChevronRight
                  className="w-3 h-3 text-muted-foreground/50"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Warnings */}
      {recommendation.warnings.length > 0 && (
        <div className="space-y-1.5 mt-3 pt-3 border-t">
          {recommendation.warnings.map((warning, index) => {
            const Icon = getWarningIcon(warning.severity);
            return (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-2 text-xs p-2 rounded",
                  getWarningColor(warning.severity)
                )}
              >
                <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{warning.message}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Primary indicator */}
      {isPrimary && (
        <div className="mt-3 pt-3 border-t border-primary/20">
          <span className="text-xs font-medium text-primary">
            Recommended option
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for RecommendationCard
 */
export function RecommendationCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-4 rounded-lg border bg-card", className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
      </div>

      {/* Times skeleton */}
      <div className="flex items-center gap-4 mb-4">
        <div className="h-4 w-28 bg-muted animate-pulse rounded" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </div>

      {/* Segments skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-6 w-16 bg-muted animate-pulse rounded" />
        <div className="h-6 w-16 bg-muted animate-pulse rounded" />
        <div className="h-6 w-20 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}
