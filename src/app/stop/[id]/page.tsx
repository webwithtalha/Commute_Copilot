"use client";

import { use, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Header,
  Footer,
  StopLetterBadge,
  ArrivalsList,
  Button,
  Skeleton,
  ErrorState,
} from "@/components";
import { useStopDetails, useArrivals } from "@/hooks";
import { useRecents } from "@/context";
import { ArrowLeft, Share2, Check, MapPin, RefreshCw } from "lucide-react";

interface StopPageProps {
  params: Promise<{ id: string }>;
}

export default function StopPage({ params }: StopPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const { addRecent } = useRecents();

  // Fetch stop details
  const {
    stop,
    isLoading: isLoadingStop,
    error: stopError,
    refetch: refetchStop,
  } = useStopDetails(id);

  // Track this stop as recently viewed
  useEffect(() => {
    if (stop && !isLoadingStop) {
      addRecent(stop);
    }
  }, [stop, isLoadingStop, addRecent]);

  // Fetch arrivals with auto-refresh
  const {
    arrivals,
    isLoading: isLoadingArrivals,
    isFetching: isRefreshingArrivals,
    lastUpdated,
    error: arrivalsError,
    refresh: refreshArrivals,
  } = useArrivals(id, {
    refreshInterval: 15000, // 15 seconds
    enabled: Boolean(id) && !stopError,
  });

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: stop?.name ? `${stop.name} - Commute Copilot` : "Commute Copilot",
          text: `Check live arrivals at ${stop?.name || "this stop"}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled share or clipboard failed
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Ignore clipboard errors
      }
    }
  }, [stop?.name]);

  const handleRetryStop = useCallback(() => {
    refetchStop();
  }, [refetchStop]);

  const handleRetryArrivals = useCallback(() => {
    refreshArrivals();
  }, [refreshArrivals]);

  // Determine error type
  const getErrorType = () => {
    if (!navigator.onLine) return "network" as const;
    if (stopError?.message?.includes("not found") || stopError?.message?.includes("404")) {
      return "not-found" as const;
    }
    return "generic" as const;
  };

  // Error state for stop loading failure
  if (stopError) {
    const errorType = getErrorType();
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container max-w-3xl mx-auto px-4 py-6 sm:py-8 page-transition">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <ErrorState
            type={errorType}
            onRetry={errorType !== "not-found" ? handleRetryStop : undefined}
            isRetrying={isLoadingStop}
            showHomeButton
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-4 sm:py-6 page-transition">
        {/* Navigation Bar */}
        <nav className="flex items-center justify-between mb-4 sm:mb-6" aria-label="Page navigation">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="-ml-2 text-muted-foreground hover:text-foreground"
            aria-label="Go back to previous page"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
            aria-label={copied ? "Link copied to clipboard" : "Share this stop"}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" aria-hidden="true" />
                <span>Share</span>
              </>
            )}
          </Button>
        </nav>

        {/* Stop Header */}
        <section className="mb-6 sm:mb-8" aria-label="Stop information">
          {isLoadingStop ? (
            <StopHeaderSkeleton />
          ) : stop ? (
            <div className="flex items-start gap-3 sm:gap-4 animate-in fade-in duration-300">
              <StopLetterBadge letter={stop.stopLetter} size="lg" />
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">
                  {stop.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 mt-1 sm:mt-2 text-muted-foreground">
                  {stop.stopCode && (
                    <span className="font-mono text-sm sm:text-base">
                      Stop {stop.stopCode}
                    </span>
                  )}
                  {stop.direction && (
                    <span className="text-sm sm:text-base">→ {stop.direction}</span>
                  )}
                </div>
                {stop.lines.length > 0 && (
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2 sm:mt-3">
                    {stop.lines.slice(0, 8).map((line) => (
                      <span
                        key={line}
                        className="line-badge text-xs sm:text-sm"
                      >
                        {line}
                      </span>
                    ))}
                    {stop.lines.length > 8 && (
                      <span className="text-xs sm:text-sm text-muted-foreground self-center ml-1">
                        +{stop.lines.length - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>

        {/* Divider */}
        <div className="border-t mb-4 sm:mb-6" role="separator" />

        {/* Arrivals Section */}
        <section aria-label="Live arrivals">
          <ArrivalsList
            arrivals={arrivals}
            isLoading={isLoadingArrivals}
            isRefreshing={isRefreshingArrivals}
            lastUpdated={lastUpdated ?? undefined}
            refreshInterval={15}
            error={arrivalsError?.message}
            onRetry={handleRetryArrivals}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}

function StopHeaderSkeleton() {
  return (
    <div className="flex items-start gap-3 sm:gap-4" role="status" aria-label="Loading stop information">
      {/* Badge skeleton */}
      <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2 sm:space-y-3">
        {/* Name skeleton */}
        <Skeleton className="h-6 sm:h-8 w-3/4" />
        {/* Details skeleton */}
        <div className="flex gap-2 sm:gap-3">
          <Skeleton className="h-4 sm:h-5 w-20 sm:w-24" />
          <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
        </div>
        {/* Lines skeleton */}
        <div className="flex gap-1.5 sm:gap-2">
          <Skeleton className="h-5 sm:h-6 w-8 sm:w-10" />
          <Skeleton className="h-5 sm:h-6 w-8 sm:w-10" />
          <Skeleton className="h-5 sm:h-6 w-8 sm:w-10" />
          <Skeleton className="h-5 sm:h-6 w-8 sm:w-10" />
        </div>
      </div>
      <span className="sr-only">Loading stop information...</span>
    </div>
  );
}

