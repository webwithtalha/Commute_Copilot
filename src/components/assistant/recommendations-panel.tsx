"use client";

import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  RecommendationCard,
  RecommendationCardSkeleton,
} from "./recommendation-card";
import { WeatherBadge } from "./weather-badge";
import { useJourneyPlanner } from "@/hooks/use-journey-planner";
import { useGeolocation } from "@/hooks";
import {
  ChevronLeft,
  MapPin,
  Clock,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import type { Stop } from "@/types/tfl";

interface RecommendationsPanelProps {
  destination: Stop;
  arrivalTime: Date;
  onBack: () => void;
  onReset: () => void;
  className?: string;
}

/**
 * Format date/time for display
 */
function formatArrivalTime(date: Date): string {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Panel displaying journey recommendations
 */
export function RecommendationsPanel({
  destination,
  arrivalTime,
  onBack,
  onReset,
  className,
}: RecommendationsPanelProps) {
  const { position } = useGeolocation({ autoFetch: true });
  const {
    planJourney,
    isLoading,
    error,
    recommendations,
    weather,
    reset: resetPlanner,
  } = useJourneyPlanner();

  // Fetch recommendations on mount
  useEffect(() => {
    planJourney({
      destination,
      arrivalTime,
      userLocation: position
        ? { lat: position.lat, lon: position.lon }
        : undefined,
    });
  }, [destination, arrivalTime, position, planJourney]);

  const handleRefresh = useCallback(() => {
    resetPlanner();
    planJourney({
      destination,
      arrivalTime,
      userLocation: position
        ? { lat: position.lat, lon: position.lon }
        : undefined,
    });
  }, [destination, arrivalTime, position, planJourney, resetPlanner]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Change time
      </button>

      {/* Summary header */}
      <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                Destination
              </p>
              <p className="font-semibold">
                {destination.name}
              </p>
            </div>
          </div>
          {weather && <WeatherBadge weather={weather} />}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            Arrive by <strong>{formatArrivalTime(arrivalTime)}</strong>
          </span>
        </div>
      </div>

      {/* AI badge */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>AI-powered recommendations</span>
        {!isLoading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="ml-auto h-7 gap-1 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          <RecommendationCardSkeleton />
          <RecommendationCardSkeleton />
          <RecommendationCardSkeleton />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-6 rounded-lg border bg-destructive/5 border-destructive/20 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="font-semibold mb-1">Unable to get recommendations</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        </div>
      )}

      {/* Recommendations list */}
      {!isLoading && !error && recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div
              key={rec.id}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: "both",
              }}
            >
              <RecommendationCard
                recommendation={rec}
                isPrimary={index === 0}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && recommendations.length === 0 && (
        <div className="p-6 rounded-lg border text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No recommendations available</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We couldn&apos;t find suitable departure times for your journey. The
            arrival time may be too soon or there may be no services available.
          </p>
          <Button variant="outline" onClick={onReset}>
            Try a different time
          </Button>
        </div>
      )}

      {/* Start over button */}
      {!isLoading && recommendations.length > 0 && (
        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            onClick={onReset}
            className="w-full text-muted-foreground"
          >
            Plan a different journey
          </Button>
        </div>
      )}
    </div>
  );
}
