"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAssistantStore } from "@/store/assistant-store";
import {
  DestinationPicker,
  TimePicker,
  RecommendationsPanel,
} from "@/components/assistant";
import { Bot } from "lucide-react";
import type { Stop } from "@/types/tfl";

interface AssistantViewProps {
  className?: string;
}

/**
 * AI Journey Planner view
 * 3-step wizard: destination -> time -> results
 */
export function AssistantView({ className }: AssistantViewProps) {
  const {
    step,
    destination,
    arrivalTime,
    setDestination,
    setArrivalTime,
    goToTime,
    goToResults,
    goBack,
    reset,
  } = useAssistantStore();

  const handleDestinationSelect = useCallback(
    (stop: Stop) => {
      setDestination(stop);
      goToTime();
    },
    [setDestination, goToTime]
  );

  const handleTimeSelect = useCallback(
    (time: Date) => {
      setArrivalTime(time);
      goToResults();
    },
    [setArrivalTime, goToResults]
  );

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className={cn("p-4 sm:p-6", className)}>
      {/* Header */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            AI Journey Planner
          </h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          {step === "destination" && "Where do you need to go?"}
          {step === "time" && "When do you need to arrive?"}
          {step === "results" && "Here are your departure options"}
        </p>
      </section>

      {/* Step indicator */}
      <section className="mb-6">
        <div className="flex items-center gap-2">
          <StepIndicator
            number={1}
            label="Destination"
            isActive={step === "destination"}
            isComplete={step === "time" || step === "results"}
          />
          <div
            className={cn(
              "flex-1 h-0.5 rounded-full transition-colors",
              step === "time" || step === "results"
                ? "bg-primary"
                : "bg-muted"
            )}
          />
          <StepIndicator
            number={2}
            label="Time"
            isActive={step === "time"}
            isComplete={step === "results"}
          />
          <div
            className={cn(
              "flex-1 h-0.5 rounded-full transition-colors",
              step === "results" ? "bg-primary" : "bg-muted"
            )}
          />
          <StepIndicator
            number={3}
            label="Plan"
            isActive={step === "results"}
            isComplete={false}
          />
        </div>
      </section>

      {/* Content area */}
      <section>
        {step === "destination" && (
          <div className="animate-in fade-in duration-300">
            <DestinationPicker onSelect={handleDestinationSelect} />
          </div>
        )}

        {step === "time" && destination && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <TimePicker
              destination={destination}
              onSelect={handleTimeSelect}
              onBack={goBack}
            />
          </div>
        )}

        {step === "results" && destination && arrivalTime && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <RecommendationsPanel
              destination={destination}
              arrivalTime={arrivalTime}
              onBack={goBack}
              onReset={handleReset}
            />
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * Step indicator component
 */
function StepIndicator({
  number,
  label,
  isActive,
  isComplete,
}: {
  number: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
          isActive && "bg-primary text-primary-foreground",
          isComplete && "bg-primary/80 text-primary-foreground",
          !isActive && !isComplete && "bg-muted text-muted-foreground"
        )}
      >
        {isComplete ? (
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          number
        )}
      </div>
      <span
        className={cn(
          "text-[10px] font-medium hidden sm:block",
          isActive || isComplete ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}
