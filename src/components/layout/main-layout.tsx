"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Sidebar, MobileNav, type SidebarView } from "./sidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children?: ReactNode;
  renderContent?: (activeView: SidebarView) => ReactNode;
  onViewChange?: (view: SidebarView) => void;
  className?: string;
}

export function MainLayout({ children, renderContent, onViewChange, className }: MainLayoutProps) {
  const [activeView, setActiveView] = useState<SidebarView>("search");

  // Notify parent of view changes
  useEffect(() => {
    onViewChange?.(activeView);
  }, [activeView, onViewChange]);

  // Map view needs special handling - no overflow, full height
  const isMapView = activeView === "map";

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Mobile navigation - hide on map view */}
      {!isMapView && <MobileNav activeView={activeView} onViewChange={setActiveView} />}

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        {/* Main content area */}
        <main className={cn(
          "flex-1 min-h-0",
          isMapView ? "overflow-hidden relative h-full" : "overflow-auto"
        )}>
          {renderContent ? renderContent(activeView) : children}
        </main>
      </div>
    </div>
  );
}

export { type SidebarView };
