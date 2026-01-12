"use client";

import { useCity } from "@/context/city-context";
import { cn } from "@/lib/utils";
import { ChevronDown, MapPin } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface CitySelectorProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * CitySelector - Dropdown to select the active city for transit data.
 * Persists selection to localStorage and updates the theme.
 */
export function CitySelector({ className }: CitySelectorProps) {
  const { city, setCity, enabledCities, isHydrated } = useCity();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleCitySelect = (cityId: string) => {
    setCity(cityId);
    setIsOpen(false);
  };

  // Show skeleton during hydration to prevent layout shift
  if (!isHydrated) {
    return (
      <div className={cn("h-9 w-28 animate-pulse rounded-md bg-muted", className)} />
    );
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-background/80 px-3 py-2",
          "text-sm font-medium text-foreground",
          "hover:bg-accent hover:border-accent-foreground/20",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "transition-colors duration-150",
          "min-h-[36px]"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Select city. Currently selected: ${city.name}`}
      >
        {/* City color indicator */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: city.brandColor }}
          aria-hidden="true"
        />
        
        <span className="truncate">{city.name}</span>
        
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-150",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1 z-50",
            "min-w-[160px] w-max",
            "rounded-md border border-border bg-popover shadow-lg",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
          )}
          role="listbox"
          aria-label="Select city"
        >
          <ul className="py-1">
            {enabledCities.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => handleCitySelect(c.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left",
                    "text-sm transition-colors duration-100",
                    c.id === city.id
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-popover-foreground hover:bg-accent/50"
                  )}
                  role="option"
                  aria-selected={c.id === city.id}
                >
                  {/* City color indicator */}
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-black/10"
                    style={{ backgroundColor: c.brandColor }}
                    aria-hidden="true"
                  />
                  
                  <div className="flex flex-col">
                    <span>{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.region}</span>
                  </div>
                  
                  {/* Checkmark for selected */}
                  {c.id === city.id && (
                    <svg
                      className="w-4 h-4 ml-auto text-primary flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
          
          {/* Footer hint */}
          <div className="border-t border-border px-3 py-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3 h-3" aria-hidden="true" />
              More cities coming soon
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

