"use client";

import { Navigation, Plus, Minus, Map, Satellite, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMapsStore, type MapStyle } from "@/store";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface MapControlsProps {
  onLocate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  currentZoom: number;
  minZoom?: number;
  maxZoom?: number;
}

const mapStyleOptions: { value: MapStyle; label: string; icon: React.ReactNode }[] = [
  { value: "default", label: "Default", icon: <Map className="w-4 h-4" /> },
  { value: "streets", label: "Streets", icon: <Map className="w-4 h-4" /> },
  { value: "satellite", label: "Satellite", icon: <Satellite className="w-4 h-4" /> },
];

export function MapControls({
  onLocate,
  onZoomIn,
  onZoomOut,
  onResetView,
  currentZoom,
  minZoom = 3,
  maxZoom = 18,
}: MapControlsProps) {
  const { mapStyle, setMapStyle, isLocating } = useMapsStore();

  return (
    <>
      {/* Top right controls */}
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-[1000] flex items-center gap-1.5 sm:gap-2">
        {/* Map style selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-background/95 backdrop-blur shadow-lg h-9 w-9 sm:h-10 sm:w-10"
            >
              {mapStyle === "satellite" ? (
                <Satellite className="w-4 h-4" />
              ) : (
                <Map className="w-4 h-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {mapStyleOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setMapStyle(option.value)}
                className={cn(
                  "flex items-center gap-2",
                  mapStyle === option.value && "bg-accent"
                )}
              >
                {option.icon}
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <ThemeToggle />
      </div>

      {/* Bottom right controls - positioned above the mobile sheet */}
      <div className={cn(
        "absolute right-3 sm:right-4 z-[999]",
        "flex flex-col gap-1.5 sm:gap-2",
        // Mobile: position above the bottom sheet (45vh default)
        "bottom-[calc(45vh+16px)] sm:bottom-4"
      )}>
        {/* Locate button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onLocate}
          disabled={isLocating}
          className="bg-background/95 backdrop-blur shadow-lg h-9 w-9 sm:h-10 sm:w-10"
          title="Find my location"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
        </Button>

        {/* Reset view */}
        <Button
          variant="outline"
          size="icon"
          onClick={onResetView}
          className="bg-background/95 backdrop-blur shadow-lg h-9 w-9 sm:h-10 sm:w-10"
          title="Reset view"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        {/* Zoom controls */}
        <div className="flex flex-col bg-background/95 backdrop-blur rounded-md shadow-lg border overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            disabled={currentZoom >= maxZoom}
            className="rounded-none border-b h-8 w-8 sm:h-9 sm:w-9"
            title="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            disabled={currentZoom <= minZoom}
            className="rounded-none h-8 w-8 sm:h-9 sm:w-9"
            title="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
