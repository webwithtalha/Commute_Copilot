"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingPageProps {
  /** Message to display while loading */
  message?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Full-page loading state with spinner and message.
 * Used for page-level loading states.
 */
export function LoadingPage({
  message = "Loading...",
  className,
}: LoadingPageProps) {
  return (
    <div
      className={cn(
        "min-h-[50vh] flex flex-col items-center justify-center gap-4 p-4",
        "animate-in fade-in duration-300",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        {/* TfL-inspired loading animation */}
        <div className="w-16 h-16 rounded-full bg-tfl-red/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-tfl-red animate-spin" />
        </div>
      </div>
      <p className="text-muted-foreground text-sm font-medium">{message}</p>
    </div>
  );
}

/**
 * Inline loading spinner for smaller loading states.
 */
export function LoadingSpinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2
      className={cn("animate-spin text-primary", sizeClasses[size], className)}
      role="status"
      aria-label="Loading"
    />
  );
}

