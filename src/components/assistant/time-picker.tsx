"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, MapPin, ChevronLeft } from "lucide-react";
import type { Stop } from "@/types/tfl";

interface TimePickerProps {
  destination: Stop;
  onSelect: (time: Date) => void;
  onBack: () => void;
  className?: string;
}

interface QuickTimeOption {
  label: string;
  minutes: number;
}

const QUICK_OPTIONS: QuickTimeOption[] = [
  { label: "In 30 mins", minutes: 30 },
  { label: "In 1 hour", minutes: 60 },
  { label: "In 2 hours", minutes: 120 },
];

/**
 * Time picker component for selecting desired arrival time
 */
export function TimePicker({
  destination,
  onSelect,
  onBack,
  className,
}: TimePickerProps) {
  const [customTime, setCustomTime] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handleQuickSelect = useCallback(
    (minutes: number) => {
      const arrivalTime = new Date();
      arrivalTime.setMinutes(arrivalTime.getMinutes() + minutes);
      onSelect(arrivalTime);
    },
    [onSelect]
  );

  const handleCustomSubmit = useCallback(() => {
    if (!customTime) return;

    // Parse HH:MM format
    const [hours, minutes] = customTime.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;

    const arrivalTime = new Date();
    arrivalTime.setHours(hours, minutes, 0, 0);

    // If the time is in the past, assume tomorrow
    if (arrivalTime <= new Date()) {
      arrivalTime.setDate(arrivalTime.getDate() + 1);
    }

    onSelect(arrivalTime);
  }, [customTime, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleCustomSubmit();
      }
    },
    [handleCustomSubmit]
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Change destination
      </button>

      {/* Destination summary */}
      <div className="p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Destination</p>
            <p className="font-semibold">{destination.name}</p>
            {destination.stopCode && (
              <p className="text-sm text-muted-foreground">
                Stop {destination.stopCode}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Time selection header */}
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-1">
          When do you need to arrive?
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a time and we&apos;ll tell you when to leave
        </p>
      </div>

      {/* Quick options */}
      <div className="grid gap-3">
        {QUICK_OPTIONS.map((option) => (
          <Button
            key={option.minutes}
            variant="outline"
            size="lg"
            onClick={() => handleQuickSelect(option.minutes)}
            className="w-full justify-start gap-3 h-14 text-base"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            {option.label}
          </Button>
        ))}
      </div>

      {/* Custom time toggle */}
      {!showCustom ? (
        <Button
          variant="ghost"
          onClick={() => setShowCustom(true)}
          className="w-full text-muted-foreground"
        >
          Or enter a specific time
        </Button>
      ) : (
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border animate-in fade-in duration-200">
          <label className="text-sm font-medium">Enter arrival time</label>
          <div className="flex gap-2">
            <Input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              autoFocus
            />
            <Button
              onClick={handleCustomSubmit}
              disabled={!customTime}
            >
              Set Time
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            If the time has passed today, we&apos;ll assume you mean tomorrow
          </p>
        </div>
      )}
    </div>
  );
}
