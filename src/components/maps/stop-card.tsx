"use client";

import { MapPin, Star, Clock, ChevronRight, Bus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMapsStore, formatDistance, getDistanceFromUser } from "@/store";
import { useFavorites } from "@/context";
import { useArrivals } from "@/hooks";
import { cn } from "@/lib/utils";
import type { Stop } from "@/types/tfl";

interface StopCardProps {
  stop: Stop;
  isSelected?: boolean;
  isExpanded?: boolean;
  onClick?: () => void;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return "Due";
  const mins = Math.floor(seconds / 60);
  return `${mins} min`;
}

// Collapsed card view
function CollapsedCard({ stop, isSelected, onClick }: StopCardProps) {
  const { userLocation } = useMapsStore();
  const { isFavorite } = useFavorites();
  const distance = getDistanceFromUser(stop, userLocation);
  const favorite = isFavorite(stop.naptanId);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        "hover:bg-accent hover:shadow-md",
        isSelected
          ? "bg-accent border-primary shadow-md"
          : "bg-card border-border"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Stop indicator */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
          "bg-primary text-primary-foreground font-bold text-sm"
        )}>
          {stop.stopLetter || <Bus className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground truncate">{stop.name}</h4>
            {favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {stop.stopCode && (
              <span className="font-mono">{stop.stopCode}</span>
            )}
            {distance !== null && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {formatDistance(distance)}
                </span>
              </>
            )}
          </div>

          {/* Lines preview */}
          {stop.lines && stop.lines.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {stop.lines.slice(0, 4).map((line) => (
                <Badge key={line} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {line}
                </Badge>
              ))}
              {stop.lines.length > 4 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{stop.lines.length - 4}
                </Badge>
              )}
            </div>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// Expanded card view with arrivals
function ExpandedCard({ stop, onClick }: StopCardProps) {
  const { userLocation } = useMapsStore();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
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
    <div className="bg-card border border-primary rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
            "bg-primary text-primary-foreground font-bold text-lg"
          )}>
            {stop.stopLetter || <Bus className="w-6 h-6" />}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{stop.name}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              {stop.stopCode && (
                <span className="font-mono">{stop.stopCode}</span>
              )}
              {distance !== null && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {formatDistance(distance)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Favorite button */}
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
        </div>

        {/* Lines */}
        {stop.lines && stop.lines.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {stop.lines.map((line) => (
              <Badge key={line} variant="secondary" className="text-xs">
                {line}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Arrivals */}
      <div className="p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
          <Clock className="w-4 h-4" />
          Next arrivals
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-2">Loading arrivals...</div>
        ) : arrivals && arrivals.length > 0 ? (
          <div className="space-y-2">
            {arrivals.slice(0, 5).map((arrival, index) => (
              <div
                key={`${arrival.id}-${index}`}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Badge className="text-xs font-bold">{arrival.lineName}</Badge>
                  <span className="text-sm truncate max-w-[120px]">{arrival.destination}</span>
                </div>
                <span className="font-mono font-bold text-primary text-sm">
                  {formatTime(arrival.timeToStation)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-2">No arrivals scheduled</div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 pt-0">
        <Button className="w-full" onClick={onClick}>
          View full details
        </Button>
      </div>
    </div>
  );
}

export function StopCard({ stop, isSelected, isExpanded, onClick }: StopCardProps) {
  if (isExpanded) {
    return <ExpandedCard stop={stop} onClick={onClick} />;
  }
  return <CollapsedCard stop={stop} isSelected={isSelected} onClick={onClick} />;
}
