"use client";

import { MapPin, Star, Clock, ChevronRight, Bus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMapsStore, formatDistance, getDistanceFromUser } from "@/store";
import { useFavorites, useCity } from "@/context";
import { useArrivals } from "@/hooks";
import { cn } from "@/lib/utils";
import type { Stop } from "@/types/tfl";

interface StopCardProps {
  stop: Stop;
  isSelected?: boolean;
  isExpanded?: boolean;
  isCompact?: boolean;
  onClick?: () => void;
  onClose?: () => void;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return "Due";
  const mins = Math.floor(seconds / 60);
  return `${mins} min`;
}

// Compact card view for mobile list
function CompactCard({ stop, isSelected, onClick }: StopCardProps) {
  const { userLocation } = useMapsStore();
  const { isFavorite } = useFavorites();
  const { city } = useCity();
  const distance = getDistanceFromUser(stop, userLocation);
  const favorite = isFavorite(stop.naptanId);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-2.5 rounded-lg border transition-all",
        "hover:bg-accent active:scale-[0.98]",
        isSelected
          ? "border-[var(--city-brand)]"
          : "bg-card border-border"
      )}
      style={isSelected ? { backgroundColor: `${city.brandColor}15` } : undefined}
    >
      <div className="flex items-center gap-2.5">
        {/* Bus icon */}
        <div
          className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-full text-white"
          style={{ backgroundColor: city.brandColor }}
        >
          <Bus className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium text-sm text-foreground truncate">{stop.name}</h4>
            {favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
            {distance !== null && (
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                {formatDistance(distance)}
              </span>
            )}
            {stop.lines && stop.lines.length > 0 && (
              <>
                <span>•</span>
                <span className="truncate">{stop.lines.slice(0, 3).join(", ")}{stop.lines.length > 3 ? "..." : ""}</span>
              </>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </button>
  );
}

// Collapsed card view (default for desktop list)
function CollapsedCard({ stop, isSelected, onClick }: StopCardProps) {
  const { userLocation } = useMapsStore();
  const { isFavorite } = useFavorites();
  const { city } = useCity();
  const distance = getDistanceFromUser(stop, userLocation);
  const favorite = isFavorite(stop.naptanId);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        "hover:bg-accent hover:shadow-md",
        isSelected
          ? "bg-accent shadow-md"
          : "bg-card border-border"
      )}
      style={isSelected ? { borderColor: city.brandColor } : undefined}
    >
      <div className="flex items-center gap-3">
        {/* Stop indicator */}
        <div
          className="w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-full text-white"
          style={{ backgroundColor: city.brandColor }}
        >
          <Bus className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground truncate">{stop.name}</h4>
            {favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            {stop.stopCode && (
              <span className="font-mono">{stop.stopCode}</span>
            )}
            {distance !== null && (
              <>
                {stop.stopCode && <span>•</span>}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {formatDistance(distance)}
                </span>
              </>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </button>
  );
}

// Expanded card view with arrivals
function ExpandedCard({ stop, onClick, onClose }: StopCardProps) {
  const { userLocation } = useMapsStore();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { city } = useCity();
  const { arrivals, isLoading } = useArrivals(stop.naptanId, {
    refreshInterval: 30000,
    enabled: true,
  });

  const distance = getDistanceFromUser(stop, userLocation);
  const favorite = isFavorite(stop.naptanId);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorite) {
      removeFavorite(stop.naptanId);
    } else {
      addFavorite(stop);
    }
  };

  return (
    <div className="bg-card" style={{ borderColor: city.brandColor }}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b">
        <div className="flex items-start gap-3">
          {/* Stop indicator badge */}
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 rounded-full text-white"
            style={{ backgroundColor: city.brandColor }}
          >
            <Bus className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          {/* Stop info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-base sm:text-lg leading-tight">{stop.name}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs sm:text-sm text-muted-foreground">
              {stop.stopCode && (
                <span className="font-mono">{stop.stopCode}</span>
              )}
              {stop.stopCode && distance !== null && <span>•</span>}
              {distance !== null && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {formatDistance(distance)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleFavoriteClick}
              className="h-8 w-8"
            >
              <Star className={cn(
                "w-4 h-4",
                favorite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
              )} />
            </Button>
            {onClose && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Lines */}
        {stop.lines && stop.lines.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {stop.lines.slice(0, 8).map((line) => (
              <Badge key={line} variant="secondary" className="text-xs">
                {line}
              </Badge>
            ))}
            {stop.lines.length > 8 && (
              <Badge variant="outline" className="text-xs">
                +{stop.lines.length - 8}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Arrivals */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground mb-2">
          <Clock className="w-4 h-4" />
          Next arrivals
        </div>

        {isLoading ? (
          <div className="text-xs sm:text-sm text-muted-foreground py-2">Loading arrivals...</div>
        ) : arrivals && arrivals.length > 0 ? (
          <div className="space-y-1.5">
            {arrivals.slice(0, 4).map((arrival, index) => (
              <div
                key={`${arrival.id}-${index}`}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className="text-xs font-bold flex-shrink-0">{arrival.lineName}</Badge>
                  <span className="text-xs sm:text-sm truncate">{arrival.destination}</span>
                </div>
                <span
                  className="font-mono font-bold text-xs sm:text-sm flex-shrink-0 ml-2"
                  style={{ color: city.brandColor }}
                >
                  {formatTime(arrival.timeToStation)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs sm:text-sm text-muted-foreground py-2">No arrivals scheduled</div>
        )}
      </div>

      {/* Action button */}
      <div className="p-3 sm:p-4 pt-0">
        <Button
          className="w-full h-9 sm:h-10 text-sm"
          style={{ backgroundColor: city.brandColor, color: 'white' }}
          onClick={onClick}
        >
          View full details
        </Button>
      </div>
    </div>
  );
}

export function StopCard({ stop, isSelected, isExpanded, isCompact, onClick, onClose }: StopCardProps) {
  if (isExpanded) {
    return <ExpandedCard stop={stop} onClick={onClick} onClose={onClose} />;
  }
  if (isCompact) {
    return <CompactCard stop={stop} isSelected={isSelected} onClick={onClick} />;
  }
  return <CollapsedCard stop={stop} isSelected={isSelected} onClick={onClick} />;
}
