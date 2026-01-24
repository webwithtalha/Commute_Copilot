"use client";

import { cn } from "@/lib/utils";
import { Cloud, CloudRain, CloudSnow, Sun, CloudSun, Droplets } from "lucide-react";
import type { WeatherConditions } from "@/types/assistant";

interface WeatherBadgeProps {
  weather: WeatherConditions;
  className?: string;
  showPrecipitation?: boolean;
}

/**
 * Get weather icon based on condition
 */
function getWeatherIcon(condition: WeatherConditions["condition"]) {
  switch (condition) {
    case "clear":
      return Sun;
    case "cloudy":
      return CloudSun;
    case "rain":
      return CloudRain;
    case "heavy_rain":
      return CloudRain;
    case "snow":
      return CloudSnow;
    default:
      return Cloud;
  }
}

/**
 * Get weather icon color
 */
function getWeatherColor(condition: WeatherConditions["condition"]) {
  switch (condition) {
    case "clear":
      return "text-amber-500";
    case "cloudy":
      return "text-slate-500";
    case "rain":
      return "text-blue-500";
    case "heavy_rain":
      return "text-blue-600";
    case "snow":
      return "text-cyan-400";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Badge displaying current weather conditions
 */
export function WeatherBadge({
  weather,
  className,
  showPrecipitation = true,
}: WeatherBadgeProps) {
  const Icon = getWeatherIcon(weather.condition);
  const iconColor = getWeatherColor(weather.condition);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border",
        className
      )}
    >
      <Icon className={cn("w-4 h-4", iconColor)} aria-hidden="true" />
      <span className="text-sm font-medium">{weather.temperature}°C</span>
      {showPrecipitation && weather.precipitationProbability > 0 && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Droplets className="w-3 h-3 text-blue-400" aria-hidden="true" />
          {weather.precipitationProbability}%
        </span>
      )}
    </div>
  );
}

/**
 * Compact weather badge for inline use
 */
export function WeatherBadgeCompact({
  weather,
  className,
}: Omit<WeatherBadgeProps, "showPrecipitation">) {
  const Icon = getWeatherIcon(weather.condition);
  const iconColor = getWeatherColor(weather.condition);

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Icon className={cn("w-4 h-4", iconColor)} aria-hidden="true" />
      <span className="text-sm">{weather.temperature}°</span>
    </div>
  );
}
