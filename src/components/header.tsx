"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface HeaderProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * App header with logo and navigation.
 * Features a TfL roundel-inspired logo design.
 */
export function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="container flex h-16 items-center px-4 max-w-3xl mx-auto">
        <Link href="/" className="flex items-center gap-3 group">
          {/* TfL Roundel-inspired logo */}
          <div className="relative w-10 h-10">
            {/* Red circle */}
            <div className="absolute inset-0 rounded-full bg-tfl-red" />
            {/* Blue bar */}
            <div className="absolute top-1/2 left-0 right-0 h-3 bg-tfl-blue -translate-y-1/2" />
            {/* Logo text inside bar */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-xs tracking-tight">
                CC
              </span>
            </div>
          </div>

          {/* App name */}
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-none tracking-tight text-foreground group-hover:text-tfl-blue transition-colors">
              Commute Copilot
            </span>
            <span className="text-xs text-muted-foreground leading-tight">
              Live bus arrivals
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}

