# Commute Copilot - UI Improvement Plan

Inspired by [Square UI Maps](https://github.com/ln-dev7/square-ui/tree/master/templates/maps)

---

## Overview

This document outlines UI improvements to make Commute Copilot cleaner and more user-friendly, based on the Square UI Maps template design patterns.

---

## Current vs Proposed UI

### Current Flow
```
Home Page → Search → Click Stop → New Page (Arrivals)
```

### Proposed Flow
```
Single Page App with Sidebar → Search/Favorites/Recents → Expandable Cards (Arrivals inline)
```

---

## Proposed Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER                                                       │
│  ┌────────────┐                          ┌─────────────────┐ │
│  │ CC Logo    │  Commute Copilot         │ Outside London ▼│ │
│  └────────────┘                          └─────────────────┘ │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                  │
│  SIDEBAR   │  MAIN CONTENT                                   │
│            │                                                  │
│  ┌──────┐  │  ┌────────────────────────────────────────────┐│
│  │Search│  │  │ 🔍 Search stops...          [Sort ▼]       ││
│  └──────┘  │  └────────────────────────────────────────────┘│
│            │                                                  │
│  ┌──────┐  │  ┌────────────────────────────────────────────┐│
│  │ ★    │  │  │ STOP CARD (Collapsed)                      ││
│  │Faves │  │  │ ┌────┐                                     ││
│  │ (3)  │  │  │ │ A  │  Oxford Street         ♡    0.2km  ││
│  └──────┘  │  │ └────┘  Lines: 25, 73, N25                 ││
│            │  └────────────────────────────────────────────┘│
│  ┌──────┐  │                                                  │
│  │ ◷    │  │  ┌────────────────────────────────────────────┐│
│  │Recent│  │  │ STOP CARD (Expanded)                       ││
│  │ (5)  │  │  │ ┌────┐                                     ││
│  └──────┘  │  │ │ B  │  High Street            ♥    0.5km ││
│            │  │ └────┘  Lines: 10, 15                      ││
│  ────────  │  │                                             ││
│            │  │  LIVE ARRIVALS                              ││
│  FILTERS   │  │  ┌─────────────────────────────────────┐   ││
│            │  │  │ 🚌 25   Oxford Circus      2 mins   │   ││
│  ○ Nearby  │  │  │ 🚌 73   Victoria           5 mins   │   ││
│  ○ Bus     │  │  │ 🚌 N25  Ilford            12 mins   │   ││
│  ○ Tram    │  │  └─────────────────────────────────────┘   ││
│            │  │                                             ││
│            │  │  [📍 Directions]  [↻ Refresh]              ││
│            │  └────────────────────────────────────────────┘│
│            │                                                  │
│            │  ┌────────────────────────────────────────────┐│
│            │  │         MAP VIEW (Optional)                ││
│            │  │    🔴 Stop markers on interactive map      ││
│            │  └────────────────────────────────────────────┘│
│            │                                                  │
└────────────┴─────────────────────────────────────────────────┘
```

---

## New Features

### 1. Sidebar Navigation

**Purpose**: Quick access to different views without cluttering the main UI.

**Components**:
- Search (current view)
- Favorites (saved stops)
- Recents (last 10 viewed)
- Filters (optional)

**File**: `src/components/sidebar.tsx`

```typescript
// Sidebar items
const navItems = [
  { icon: Search, label: "Search", path: "/", count: null },
  { icon: Star, label: "Favorites", path: "/favorites", count: favorites.length },
  { icon: Clock, label: "Recents", path: "/recents", count: recents.length },
];
```

---

### 2. Favorites System

**Purpose**: Save frequently used stops for quick access.

**How it works**:
- Heart icon on each stop card
- Click to toggle favorite
- Stored in localStorage
- Synced across sessions

**Files**:
- `src/hooks/use-favorites.ts` - Hook for managing favorites
- `src/context/favorites-context.tsx` - Global state

**Data Structure**:
```typescript
interface FavoriteStop {
  id: string;
  naptanId: string;
  name: string;
  stopLetter?: string;
  lat: number;
  lon: number;
  addedAt: string; // ISO date
}
```

**Storage Key**: `commute-copilot-favorites`

---

### 3. Recent Stops

**Purpose**: Quick access to recently viewed stops.

**How it works**:
- Auto-track when user views a stop
- Keep last 10 stops
- Most recent first
- Stored in localStorage

**Files**:
- `src/hooks/use-recents.ts` - Hook for managing recents
- `src/context/recents-context.tsx` - Global state

**Data Structure**:
```typescript
interface RecentStop {
  id: string;
  naptanId: string;
  name: string;
  stopLetter?: string;
  viewedAt: string; // ISO date
}
```

**Storage Key**: `commute-copilot-recents`

---

### 4. Expandable Stop Cards

**Purpose**: View arrivals without navigating to a new page.

**States**:
1. **Collapsed**: Name, letter, distance, lines, favorite button
2. **Expanded**: All above + live arrivals + action buttons

**Behavior**:
- Click card to expand/collapse
- Only one card expanded at a time
- Auto-refresh arrivals when expanded
- Smooth animation

**File**: `src/components/stop-card-expandable.tsx`

**Props**:
```typescript
interface ExpandableStopCardProps {
  stop: Stop;
  isExpanded: boolean;
  onToggle: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
}
```

---

### 5. Sort Options

**Purpose**: Help users find stops faster.

**Sort Options**:
- Nearest first (requires geolocation)
- Alphabetical (A-Z)
- Alphabetical (Z-A)
- Most recently added (for favorites)

**File**: `src/components/sort-dropdown.tsx`

---

### 6. Map View (Future)

**Purpose**: Visual representation of nearby stops.

**Library**: Leaflet.js (free, open-source)

**Features**:
- Show stops as markers
- Click marker to see arrivals
- User location indicator
- Zoom to stop

**Files**:
- `src/components/map-view.tsx`
- `src/hooks/use-geolocation.ts`

**Note**: This is optional and can be added later.

---

## Component Hierarchy

```
App
├── Header
│   ├── Logo
│   ├── Title
│   └── CitySelector
│
├── Layout (new)
│   ├── Sidebar
│   │   ├── NavItem (Search)
│   │   ├── NavItem (Favorites)
│   │   ├── NavItem (Recents)
│   │   └── Filters (optional)
│   │
│   └── MainContent
│       ├── SearchBar + SortDropdown
│       ├── StopCardExpandable[]
│       └── MapView (optional)
│
└── Footer
```

---

## New Files to Create

```
src/
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx           # Sidebar navigation
│   │   ├── main-layout.tsx       # Layout with sidebar
│   │   └── nav-item.tsx          # Individual nav item
│   │
│   ├── stop-card-expandable.tsx  # Expandable stop card
│   ├── sort-dropdown.tsx         # Sort options dropdown
│   ├── favorite-button.tsx       # Heart toggle button
│   └── map-view.tsx              # Map component (future)
│
├── hooks/
│   ├── use-favorites.ts          # Favorites management
│   ├── use-recents.ts            # Recents management
│   └── use-geolocation.ts        # User location (future)
│
├── context/
│   ├── favorites-context.tsx     # Favorites state
│   └── recents-context.tsx       # Recents state
│
└── types/
    └── app.ts                    # New app-specific types
```

---

## Implementation Phases

### Phase 1: Foundation (Quick Wins)
- [ ] Create favorites hook and context
- [ ] Create recents hook and context
- [ ] Add favorite button to existing stop cards
- [ ] Track recent stops on view

**Estimated Effort**: 2-3 hours

### Phase 2: Expandable Cards
- [ ] Create expandable stop card component
- [ ] Inline arrivals display
- [ ] Smooth expand/collapse animation
- [ ] Auto-refresh when expanded

**Estimated Effort**: 3-4 hours

### Phase 3: Sidebar Navigation
- [ ] Create sidebar component
- [ ] Create main layout with sidebar
- [ ] Favorites page/view
- [ ] Recents page/view
- [ ] Responsive (hide on mobile, show on desktop)

**Estimated Effort**: 4-5 hours

### Phase 4: Enhancements
- [ ] Sort dropdown
- [ ] Distance calculation (geolocation)
- [ ] Better empty states
- [ ] Loading skeletons matching new design

**Estimated Effort**: 2-3 hours

### Phase 5: Map View (Optional/Future)
- [ ] Integrate Leaflet.js
- [ ] Show stops as markers
- [ ] Click marker for arrivals
- [ ] User location

**Estimated Effort**: 6-8 hours

---

## Design Tokens (Matching Square UI)

### Card Styles
```css
/* Collapsed card */
.stop-card {
  @apply rounded-lg border bg-card p-4 transition-all duration-200;
  @apply hover:border-primary/50 hover:shadow-sm;
}

/* Expanded card */
.stop-card-expanded {
  @apply rounded-lg border-2 border-primary bg-card p-4;
  @apply shadow-md;
}
```

### Sidebar Styles
```css
.sidebar {
  @apply w-64 border-r bg-background;
  @apply hidden md:block; /* Hide on mobile */
}

.nav-item {
  @apply flex items-center gap-3 px-4 py-2 rounded-md;
  @apply hover:bg-muted transition-colors;
}

.nav-item-active {
  @apply bg-primary/10 text-primary;
}
```

---

## Mobile Considerations

- Sidebar hidden on mobile (< 768px)
- Bottom sheet for filters (mobile)
- Cards stack vertically
- Touch-friendly tap targets (min 44px)
- Swipe to favorite (optional)

---

## Dependencies to Add

```json
{
  "dependencies": {
    "leaflet": "^1.9.4",           // Map (Phase 5)
    "react-leaflet": "^4.2.1"      // React wrapper for Leaflet
  }
}
```

**Note**: No new dependencies needed for Phases 1-4.

---

## Success Metrics

After implementation, the app should:

1. **Faster Access**: Users reach arrivals in 1 click (expand) vs 2 clicks (navigate)
2. **Better Retention**: Favorites bring users back
3. **Cleaner UI**: Less page navigation, more inline interaction
4. **Consistent Design**: Matches modern SaaS patterns like Square UI

---

## References

- [Square UI Maps](https://github.com/ln-dev7/square-ui/tree/master/templates/maps)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Leaflet.js](https://leafletjs.com/)
- [Lucide Icons](https://lucide.dev/)

---

*Created: January 12, 2026*
*Status: Planning*
