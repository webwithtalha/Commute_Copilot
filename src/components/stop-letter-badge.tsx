"use client";

import { cn } from "@/lib/utils";

interface StopLetterBadgeProps {
  /** The letter to display (e.g., "C", "D") */
  letter?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-lg",
  lg: "w-14 h-14 text-2xl",
};

/**
 * TfL-style roundel badge for stop letters.
 * Displays a red circle with white letter in the center.
 */
export function StopLetterBadge({
  letter,
  size = "md",
  className,
}: StopLetterBadgeProps) {
  // If no letter provided, show a placeholder
  const displayLetter = letter?.trim() || "•";

  return (
    <div
      className={cn(
        "rounded-full bg-tfl-red flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0",
        sizeClasses[size],
        className
      )}
      aria-label={letter ? `Stop ${letter}` : "Bus stop"}
    >
      {displayLetter}
    </div>
  );
}

