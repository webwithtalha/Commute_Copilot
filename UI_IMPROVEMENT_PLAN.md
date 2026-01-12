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

### 6. Map View ✅ (Basic Implemented)

**Purpose**: Visual representation of nearby stops.

**Library**: Leaflet.js (free, open-source)

**Current Features** (Implemented):
- Show favorites/recents as markers
- Click marker to see popup with stop info
- "View arrivals" button in popup
- User location button
- Dark mode map styling
- Legend showing marker types

**Files**:
- `src/components/views/map-view.tsx`
- `src/app/globals.css` (Leaflet styles)

---

### 7. Map Feature Options (To Be Implemented)

The map currently shows saved stops. Below are advanced feature options to enhance the map experience:

---

#### Option A: Nearby Stops Discovery ⭐ RECOMMENDED

**Purpose**: Find all bus stops near the user's current location.

**How it works**:
1. User clicks "Find nearby stops" or enables auto-detect
2. App uses geolocation to get user's position
3. API fetches all stops within a radius (e.g., 500m)
4. Stops appear as markers on the map
5. Click marker → see stop name + next 3 arrivals
6. Tap "View details" for full arrivals page

**User Flow**:
```
[Enable Location] → Map centers on user → Nearby stops load → Click marker → See arrivals
```

**API Requirements**:
- TfL: `/StopPoint?lat={lat}&lon={lon}&radius={radius}&stopTypes=NaptanPublicBusCoachTram`
- BODS: NaPTAN data with bounding box query

**Files to Create**:
- `src/hooks/use-geolocation.ts` - User location hook
- `src/hooks/use-nearby-stops.ts` - Fetch stops by location

**Estimated Effort**: Medium

**Value**: High - Core feature for transit apps
#### Option B: Live Bus Tracking ⭐ RECOMMENDED

**Purpose**: Show real-time bus positions moving on the map.

**How it works**:
1. User selects a stop or taps a marker
2. App fetches vehicle positions from SIRI-VM API
3. Buses appear as moving icons on the map
4. Each bus shows: line number, destination, direction
5. Positions update every 10-15 seconds
6. Watch buses approach your stop in real-time

**User Flow**:
```
[Select Stop] → Buses appear on map → Live updates → See bus approaching
```

**Visual Design**:
```
    🚌 25
     ↓
  ━━━━━━━━━━━━━━
       🚏 Your Stop
```

**API Requirements**:
- SIRI-VM: Already integrated! Has vehicle positions with lat/lon
- TfL: `/Line/{lineId}/Arrivals` includes vehicle positions

**Files to Create**:
- `src/components/map/bus-marker.tsx` - Animated bus icon
- `src/hooks/use-live-vehicles.ts` - Fetch vehicle positions

**Estimated Effort**: Medium

**Value**: Very High - Unique selling point, visual ETA

---

#### Option C: Search on Map

**Purpose**: Search for stops and see results as pins on the map.

**How it works**:
1. Search bar appears on map view (top)
2. User types stop name or code
3. Results appear as numbered pins on map
4. Map auto-zooms to fit all results
5. Click pin → see stop info popup
6. List of results also shown in sidebar

**User Flow**:
```
[Type search] → Pins appear → Map zooms to fit → Click pin → See arrivals
```

**Visual Design**:
```
┌─────────────────────────────────┐
│ 🔍 Search stops...              │
├─────────────────────────────────┤
│                                 │
│         📍1  📍2                │
│                                 │
│              📍3                │
│                   📍4           │
│                                 │
└─────────────────────────────────┘
```

**Files to Create**:
- `src/components/map/map-search.tsx` - Search overlay

**Estimated Effort**: Low

**Value**: Medium - Alternative to list-based search

---

#### Option D: Walking Distance to Stops

**Purpose**: Show how far each stop is by walking.

**How it works**:
1. User enables location
2. Each stop marker shows walking time (e.g., "3 min")
3. Distance badge appears on marker or in popup
4. Optionally draw walking route line to selected stop

**User Flow**:
```
[Enable Location] → Stops show "3 min walk" → Tap stop → See route line
```

**Visual Design**:
```
     📍 Oxford Street
        3 min • 250m
```

**Calculation**:
- Haversine distance for straight-line
- Average walking speed: 5 km/h (83m/min)
- Optional: Use routing API for accurate paths

**Files to Create**:
- `src/lib/distance.ts` - Distance calculations
- `src/components/map/walking-route.tsx` - Route line

**Estimated Effort**: Medium

**Value**: Medium - Helps choose closest stop

---

#### Option E: Route Planner (Advanced)

**Purpose**: Plan a journey from point A to point B.

**How it works**:
1. User sets start point (current location or search)
2. User sets destination (search or tap on map)
3. App calculates possible bus routes
4. Shows route options with stops highlighted
5. User picks a route → see step-by-step directions

**User Flow**:
```
[Set Start] → [Set End] → See route options → Pick route → Follow directions
```

**Visual Design**:
```
┌─────────────────────────────────┐
│ From: 📍 My Location            │
│ To:   🔍 Enter destination      │
├─────────────────────────────────┤
│ Route 1: Bus 25 → Walk → Bus 73 │
│ Route 2: Bus 15 direct          │
└─────────────────────────────────┘
```

**API Requirements**:
- TfL Journey Planner API
- Complex routing logic for BODS

**Files to Create**:
- `src/components/map/route-planner.tsx`
- `src/hooks/use-journey-planner.ts`

**Estimated Effort**: High

**Value**: High - Full journey planning capability

---

### Map Feature Priority Matrix

| Priority | Feature | Effort | Value | Recommendation |
|----------|---------|--------|-------|----------------|
| 1st | **Nearby Stops Discovery** | Medium | High | ⭐ Start here |
| 2nd | **Live Bus Tracking** | Medium | Very High | ⭐ High impact |
| 3rd | Search on Map | Low | Medium | Nice to have |
| 4th | Walking Distance | Medium | Medium | Enhancement |
| 5th | Route Planner | High | High | Future phase |

---

### Recommended Implementation Order

**Phase 6A: Nearby Stops** ✅ COMPLETED
- [x] Create `use-geolocation.ts` hook
- [x] Create `use-nearby-stops.ts` hook
- [x] Add "Find nearby" button to map
- [x] Display stops as markers with popup
- [x] Show arrival preview in popup
- [x] Add search radius circle visualization
- [x] Add status bar showing number of nearby stops

**Phase 6B: Live Bus Tracking** (Implement Second)
- [ ] Create `use-live-vehicles.ts` hook
- [ ] Create animated bus marker component
- [ ] Fetch vehicle positions from SIRI-VM
- [ ] Show buses moving on map
- [ ] Auto-refresh every 10-15 seconds

**Phase 6C: Enhancements** (Optional)
- [ ] Search on map overlay
- [ ] Walking distance badges
- [ ] Route lines

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

### Phase 1: Foundation (Quick Wins) ✅ COMPLETED
- [x] Create favorites hook and context
- [x] Create recents hook and context
- [x] Add favorite button to existing stop cards
- [x] Track recent stops on view

### Phase 2: Expandable Cards ⏳ PENDING
- [ ] Create expandable stop card component
- [ ] Inline arrivals display
- [ ] Smooth expand/collapse animation
- [ ] Auto-refresh when expanded

### Phase 3: Sidebar Navigation ✅ COMPLETED
- [x] Create sidebar component
- [x] Create main layout with sidebar
- [x] Favorites page/view
- [x] Recents page/view
- [x] Responsive (hide on mobile, show on desktop)

### Phase 4: Enhancements ⏳ PARTIAL
- [ ] Sort dropdown
- [ ] Distance calculation (geolocation)
- [x] Better empty states
- [x] Loading skeletons matching new design

### Phase 5: Map View & Theme ✅ COMPLETED
- [x] Integrate Leaflet.js
- [x] Show stops as markers
- [x] Click marker for arrivals
- [x] User location button
- [x] Dark/Light theme toggle
- [x] Eye-catching dark theme colors

### Phase 6: Advanced Map Features ⏳ PENDING
See "Map Feature Options" section above for detailed breakdown:
- [ ] **6A: Nearby Stops Discovery** ⭐ Recommended first
- [ ] **6B: Live Bus Tracking** ⭐ Recommended second
- [ ] 6C: Search on Map
- [ ] 6D: Walking Distance
- [ ] 6E: Route Planner (Future)

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
*Last Updated: January 12, 2026*
*Status: In Progress*

## Progress Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation | ✅ Completed | 100% |
| Phase 2: Expandable Cards | ⏳ Pending | 0% |
| Phase 3: Sidebar Navigation | ✅ Completed | 100% |
| Phase 4: Enhancements | ⏳ Partial | 50% |
| Phase 5: Map View & Theme | ✅ Completed | 100% |
| Phase 6: Advanced Map Features | ⏳ Pending | 0% |

**Overall Progress: ~60%**

**Next Steps**: Choose which Phase 6 map feature to implement (see options A-E above)
