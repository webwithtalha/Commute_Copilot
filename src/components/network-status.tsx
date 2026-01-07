"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { WifiOff, Wifi } from "lucide-react";

interface NetworkStatusProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Network status indicator that shows when the user is offline.
 * Automatically appears when connection is lost and hides when restored.
 */
export function NetworkStatus({ className }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      // Hide the "restored" message after 3 seconds
      setTimeout(() => setShowRestored(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Don't show anything if online and not showing restored message
  if (isOnline && !showRestored) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all duration-300 ease-out",
        "safe-area-bottom",
        isOnline
          ? "bg-tfl-green text-white animate-in slide-in-from-bottom"
          : "bg-amber-500 text-white animate-in slide-in-from-bottom",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You&apos;re offline. Some features may not work.</span>
        </>
      )}
    </div>
  );
}

