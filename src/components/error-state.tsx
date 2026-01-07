"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertCircle, WifiOff, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

type ErrorType = "network" | "not-found" | "server" | "generic";

interface ErrorStateProps {
  /** Type of error to display appropriate message and icon */
  type?: ErrorType;
  /** Custom title */
  title?: string;
  /** Custom message */
  message?: string;
  /** Retry callback - if provided, shows retry button */
  onRetry?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Show home button */
  showHomeButton?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const errorConfig: Record<
  ErrorType,
  { icon: typeof AlertCircle; title: string; message: string }
> = {
  network: {
    icon: WifiOff,
    title: "No internet connection",
    message:
      "Please check your connection and try again. Your data will update automatically when you're back online.",
  },
  "not-found": {
    icon: AlertCircle,
    title: "Stop not found",
    message:
      "We couldn't find this bus stop. It may have been removed or the link is incorrect.",
  },
  server: {
    icon: AlertCircle,
    title: "Something went wrong",
    message:
      "Our servers are having trouble right now. Please try again in a few moments.",
  },
  generic: {
    icon: AlertCircle,
    title: "Oops! Something went wrong",
    message:
      "We couldn't complete your request. Please try again or check back later.",
  },
};

/**
 * Reusable error state component with retry functionality.
 * Provides consistent error UI across the application.
 */
export function ErrorState({
  type = "generic",
  title,
  message,
  onRetry,
  isRetrying = false,
  showHomeButton = false,
  className,
}: ErrorStateProps) {
  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in duration-300",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-6",
          type === "network" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-destructive/10"
        )}
      >
        <Icon
          className={cn(
            "w-10 h-10",
            type === "network" ? "text-amber-600 dark:text-amber-400" : "text-destructive"
          )}
        />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2">
        {title || config.title}
      </h2>

      <p className="text-muted-foreground max-w-md mb-6">
        {message || config.message}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="gap-2"
          >
            <RefreshCw
              className={cn("w-4 h-4", isRetrying && "animate-spin")}
            />
            {isRetrying ? "Retrying..." : "Try again"}
          </Button>
        )}

        {showHomeButton && (
          <Button variant="outline" asChild>
            <Link href="/" className="gap-2">
              <Home className="w-4 h-4" />
              Go home
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

