"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { CitySelector } from "./city-selector";
import { ThemeToggle } from "./theme-toggle";
import { useCity } from "@/context/city-context";

interface HeaderProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * App header with logo, city selector, and navigation.
 * Features a dynamic roundel-inspired logo that changes color based on the selected city.
 */
export function Header({ className }: HeaderProps) {
  const { city, isHydrated } = useCity();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="container flex h-16 items-center justify-between px-4 max-w-3xl mx-auto">
        <Link href="/" className="flex items-center gap-3 group">
          {/* Roundel-inspired logo - colors adapt to selected city */}
          <div className="relative w-10 h-10">
            {/* Brand color circle */}
            <div
              className="absolute inset-0 rounded-full transition-colors duration-300"
              style={{ backgroundColor: isHydrated ? city.brandColor : '#E1251B' }}
            />
            {/* Accent color bar */}
            <div
              className="absolute top-1/2 left-0 right-0 h-3 -translate-y-1/2 transition-colors duration-300"
              style={{ backgroundColor: isHydrated ? city.accentColor : '#0019A8' }}
            />
            {/* Logo text inside bar */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-xs tracking-tight">
                CC
              </span>
            </div>
          </div>

          {/* App name */}
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-none tracking-tight text-foreground group-hover:text-primary transition-colors">
              Commute Copilot
            </span>
            <span className="text-xs text-muted-foreground leading-tight">
              Live bus arrivals
            </span>
          </div>
        </Link>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <CitySelector />
        </div>
      </div>
    </header>
  );
}

