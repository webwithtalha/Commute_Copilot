"use client";

import { useState, useCallback } from "react";
import {
  Header,
  Footer,
  MainLayout,
  SearchView,
  FavoritesView,
  RecentsView,
  MapView,
  type SidebarView,
} from "@/components";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [currentView, setCurrentView] = useState<SidebarView>("search");

  const handleViewChange = useCallback((view: SidebarView) => {
    setCurrentView(view);
  }, []);

  const renderContent = (activeView: SidebarView) => {
    switch (activeView) {
      case "map":
        return <MapView />;
      case "favorites":
        return <FavoritesView />;
      case "recents":
        return <RecentsView />;
      case "search":
      default:
        return <SearchView />;
    }
  };

  const isMapView = currentView === "map";

  return (
    <div className={cn(
      "flex flex-col bg-background",
      isMapView ? "h-[100dvh] overflow-hidden" : "min-h-screen"
    )}>
      {/* Hide header on map view for more space */}
      {!isMapView && <Header />}

      <div className="flex-1 flex flex-col min-h-0">
        <MainLayout renderContent={renderContent} onViewChange={handleViewChange} />
      </div>

      {/* Hide footer on map view */}
      {!isMapView && <Footer />}
    </div>
  );
}
