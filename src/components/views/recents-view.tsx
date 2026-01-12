"use client";

import { useRouter } from "next/navigation";
import { useFavorites, useRecents } from "@/context";
import { StopCard, StopCardSkeleton, Button } from "@/components";
import { Clock, Trash2 } from "lucide-react";
import type { Stop } from "@/types/tfl";

export function RecentsView() {
  const router = useRouter();
  const { recents, addRecent, clearRecents, isHydrated } = useRecents();
  const { isFavorite } = useFavorites();

  const handleStopClick = (stopId: string, stop: Stop) => {
    addRecent(stop);
    router.push(`/stop/${encodeURIComponent(stopId)}`);
  };

  // Convert RecentStop to Stop for StopCard
  const recentAsStop = (rec: typeof recents[0]): Stop => ({
    id: rec.id,
    naptanId: rec.naptanId,
    name: rec.name,
    stopLetter: rec.stopLetter,
    stopCode: rec.stopCode,
    lat: rec.lat,
    lon: rec.lon,
    lines: rec.lines,
    modes: ["bus"],
    direction: undefined,
    isGroup: false,
  });

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isHydrated) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold">Recent Stops</h2>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <StopCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (recents.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">Recent Stops</h2>
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center mb-4 sm:mb-6">
            <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
            No recent stops
          </h3>
          <p className="text-muted-foreground max-w-md text-sm sm:text-base px-4">
            Stops you view will appear here for quick access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">
          Recent Stops
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({recents.length})
          </span>
        </h2>
        {recents.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRecents}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Clear all
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {recents.map((rec, index) => {
          const stop = recentAsStop(rec);
          return (
            <div
              key={`${rec.id}-${rec.viewedAt}`}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
            >
              <div className="relative">
                <StopCard
                  stop={stop}
                  onClick={() => handleStopClick(rec.naptanId, stop)}
                  className="card-hover"
                />
                <span className="absolute top-2 right-12 text-xs text-muted-foreground">
                  {formatRelativeTime(rec.viewedAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
