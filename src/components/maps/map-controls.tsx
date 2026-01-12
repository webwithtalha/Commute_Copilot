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
      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
        {/* Map style selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background shadow-lg">
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

      {/* Bottom right controls */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Locate button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onLocate}
          disabled={isLocating}
          className="bg-background shadow-lg"
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
          className="bg-background shadow-lg"
          title="Reset view"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        {/* Zoom controls */}
        <div className="flex flex-col bg-background rounded-md shadow-lg border overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            disabled={currentZoom >= maxZoom}
            className="rounded-none border-b h-9 w-9"
            title="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            disabled={currentZoom <= minZoom}
            className="rounded-none h-9 w-9"
            title="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
