"use client";

import { Search, Star, Clock, Map } from "lucide-react";
import { NavItem } from "./nav-item";
import { useFavorites, useRecents } from "@/context";
import { cn } from "@/lib/utils";

export type SidebarView = "search" | "favorites" | "recents" | "map";

interface SidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  className?: string;
}

export function Sidebar({ activeView, onViewChange, className }: SidebarProps) {
  const { favorites } = useFavorites();
  const { recents } = useRecents();

  const navItems = [
    {
      id: "search" as const,
      icon: Search,
      label: "Search",
      count: null,
    },
    {
      id: "map" as const,
      icon: Map,
      label: "Map",
      count: null,
    },
    {
      id: "favorites" as const,
      icon: Star,
      label: "Favorites",
      count: favorites.length,
    },
    {
      id: "recents" as const,
      icon: Clock,
      label: "Recents",
      count: recents.length,
    },
  ];

  return (
    <aside
      className={cn(
        "w-64 border-r bg-background flex-shrink-0",
        "hidden md:flex md:flex-col",
        className
      )}
    >
      <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            count={item.count}
            isActive={activeView === item.id}
            onClick={() => onViewChange(item.id)}
          />
        ))}
      </nav>

      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Commute Copilot v1.0
        </p>
      </div>
    </aside>
  );
}

interface MobileNavProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  className?: string;
}

export function MobileNav({ activeView, onViewChange, className }: MobileNavProps) {
  const { favorites } = useFavorites();
  const { recents } = useRecents();

  const navItems = [
    {
      id: "search" as const,
      icon: Search,
      label: "Search",
      count: null,
    },
    {
      id: "map" as const,
      icon: Map,
      label: "Map",
      count: null,
    },
    {
      id: "favorites" as const,
      icon: Star,
      label: "Favorites",
      count: favorites.length,
    },
    {
      id: "recents" as const,
      icon: Clock,
      label: "Recents",
      count: recents.length,
    },
  ];

  return (
    <nav
      className={cn(
        "md:hidden flex items-center justify-center gap-1 p-2 border-b bg-background overflow-x-auto",
        className
      )}
      aria-label="Mobile navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onViewChange(item.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium",
              "transition-colors duration-200",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            <span>{item.label}</span>
            {item.count !== null && item.count > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 text-xs font-semibold rounded-full",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-background text-muted-foreground"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
