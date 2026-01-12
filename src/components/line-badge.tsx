"use client";

import { cn } from "@/lib/utils";

interface LineBadgeProps {
  /** The line/route number (e.g., "25", "73", "N25") */
  lineNumber: string;
  /** Transport mode for color coding */
  mode?: "bus" | "tube" | "dlr" | "overground" | "tram" | "elizabeth-line";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: "px-1.5 py-0.5 text-xs min-w-[28px]",
  md: "px-2 py-1 text-sm min-w-[36px]",
  lg: "px-3 py-1.5 text-base min-w-[48px]",
};

// Mode colors - bus uses city-brand for multi-city support
const modeColors = {
  bus: "bg-city-brand text-city-brand-foreground",
  tube: "bg-tfl-blue",
  dlr: "bg-[#00A0A0]",
  overground: "bg-[#EF7B10]",
  tram: "bg-[#6CBE45]",
  "elizabeth-line": "bg-[#6950A1]",
};

/**
 * Transit badge for bus/line numbers.
 * Uses city-brand color for buses, TfL-specific colors for other modes.
 */
export function LineBadge({
  lineNumber,
  mode = "bus",
  size = "md",
  className,
}: LineBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded font-bold text-white shadow-sm",
        sizeClasses[size],
        modeColors[mode],
        className
      )}
      aria-label={`Line ${lineNumber}`}
    >
      {lineNumber}
    </div>
  );
}

