"use client";

import { useRouter } from "next/navigation";
import { useFavorites, useRecents } from "@/context";
import { StopCard, StopCardSkeleton, Button } from "@/components";
import { Star, Trash2 } from "lucide-react";
import type { Stop } from "@/types/tfl";

export function FavoritesView() {
  const router = useRouter();
  const { favorites, clearFavorites, isHydrated } = useFavorites();
  const { addRecent } = useRecents();

  const handleStopClick = (stopId: string, stop: Stop) => {
    addRecent(stop);
    router.push(`/stop/${encodeURIComponent(stopId)}`);
  };

  // Convert FavoriteStop to Stop for StopCard
  const favoriteAsStop = (fav: typeof favorites[0]): Stop => ({
    id: fav.id,
    naptanId: fav.naptanId,
    name: fav.name,
    stopLetter: fav.stopLetter,
    stopCode: fav.stopCode,
    lat: fav.lat,
    lon: fav.lon,
    lines: fav.lines,
    modes: ["bus"],
    direction: undefined,
    isGroup: false,
  });

  if (!isHydrated) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold">Favorites</h2>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <StopCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">Favorites</h2>
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center mb-4 sm:mb-6">
            <Star className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
            No favorites yet
          </h3>
          <p className="text-muted-foreground max-w-md text-sm sm:text-base px-4">
            Save your frequently used stops by tapping the heart icon on any stop card.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">
          Favorites
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({favorites.length})
          </span>
        </h2>
        {favorites.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFavorites}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Clear all
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {favorites.map((fav, index) => {
          const stop = favoriteAsStop(fav);
          return (
            <div
              key={fav.id}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
            >
              <StopCard
                stop={stop}
                onClick={() => handleStopClick(fav.naptanId, stop)}
                className="card-hover"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
