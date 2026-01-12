"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  count?: number | null;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function NavItem({
  icon: Icon,
  label,
  count,
  isActive = false,
  onClick,
  className,
}: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium",
        "transition-colors duration-200",
        "hover:bg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive && "bg-primary/10 text-primary hover:bg-primary/15",
        !isActive && "text-muted-foreground hover:text-foreground",
        className
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <span className="flex-1 text-left">{label}</span>
      {count !== null && count !== undefined && count > 0 && (
        <span
          className={cn(
            "px-2 py-0.5 text-xs font-semibold rounded-full",
            isActive
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
