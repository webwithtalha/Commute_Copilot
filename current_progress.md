# Commute Copilot - Current Progress

A real-time bus arrivals app for London and UK-wide bus stops.

---

## What the App Does

1. **Search Bus Stops** - Type a stop name or 5-digit code to find bus stops
2. **See Live Arrivals** - View real-time bus arrivals with countdown timers
3. **Switch Between Cities** - Toggle between "London" and "Outside London"
4. **Auto-Refresh** - Arrivals update every 15 seconds automatically

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | Framework (App Router) |
| React 19 | UI Library |
| TypeScript | Type Safety |
| Tailwind CSS 4 | Styling |
| React Query | Data Fetching & Caching |
| Radix UI | UI Components |

---

## Project Structure (Simple View)

```
src/
  app/                    # Pages
    page.tsx              # Home (search page)
    stop/[id]/page.tsx    # Stop details page
    api/transit/          # Backend API routes

  components/             # UI Components
    header.tsx            # Top navigation bar
    city-selector.tsx     # London/Outside London dropdown
    stop-card.tsx         # Search result card
    arrivals-list.tsx     # List of bus arrivals
    arrival-item.tsx      # Single arrival row
    countdown.tsx         # Time countdown display
    line-badge.tsx        # Bus number badge (e.g., "25")

  hooks/                  # React Hooks
    use-search.ts         # Search with debounce
    use-arrivals.ts       # Fetch arrivals + auto-refresh
    use-stop-details.ts   # Fetch stop info

  lib/                    # Backend Logic
    providers/            # Transit data providers
      tfl-provider.ts     # London (TfL API)
      bods-provider.ts    # Outside London (BODS API)
    tfl-client.ts         # TfL API wrapper
    naptan-client.ts      # UK bus stop search
    gtfsrt-client.ts      # Real-time vehicle tracking

  config/
    cities.ts             # City definitions (London, Outside London)

  context/
    city-context.tsx      # Global city selection state
```

---

## How Data Flows

```
User types "Oxford"
       |
       v
useSearch hook (debounces for 300ms)
       |
       v
API Route: /api/transit/stops/search?q=Oxford&city=london
       |
       v
Provider Router (picks TfL or BODS based on city)
       |
       v
TfL API (London) OR NaPTAN/OSM (Outside London)
       |
       v
Results displayed in StopCard components
```

---

## Two Transit Providers

### 1. London (TfL Provider)
- **API**: TfL Unified API
- **Features**: Accurate real-time arrivals, stop codes, line info
- **Quality**: Excellent - official TfL data

### 2. Outside London (BODS Provider)
- **API**: BODS + Nominatim + Overpass
- **Features**: UK-wide stop search, estimated arrivals
- **Quality**: Basic - arrivals are estimated from vehicle GPS

---

## Current Features Working

- [x] Stop search by name
- [x] Stop search by 5-digit code
- [x] Real-time arrivals for London
- [x] Estimated arrivals for Outside London
- [x] Auto-refresh every 15 seconds
- [x] City switching (London / Outside London)
- [x] Stop details page with all arrivals
- [x] Group stops with children (e.g., bus stations)
- [x] Stop letter badges (A, B, C, D)
- [x] Responsive design (mobile-first)
- [x] Dark mode support
- [x] Error handling with retry

---

## Areas That Need Improvement

### High Priority

#### 1. BODS Arrivals Are Unreliable
**File**: `src/lib/gtfsrt-client.ts`

**Problem**: Outside London arrivals are estimated based on vehicle GPS distance, not actual arrival times. Shows "Via this stop" as destination which is not helpful.

**What Needs to Be Done**:
- Use BODS SIRI-VM API for actual predictions (code exists but unused)
- Match vehicles to specific stops using trip data
- Show actual destination names, not "Via this stop"

#### 2. Missing Bus Line Information for Outside London
**File**: `src/lib/naptan-client.ts`

**Problem**: Stops outside London show empty `lines: []` array. Users can't see which buses serve a stop.

**What Needs to Be Done**:
- Fetch line data from BODS timetables or GTFS static data
- Display serving lines on stop cards

#### 3. No Destination Names for BODS Arrivals
**File**: `src/lib/gtfsrt-client.ts:353`

**Problem**: All arrivals show "Via this stop" instead of actual destination.

**What Needs to Be Done**:
- Use GTFS static data to get trip headsigns
- Or use BODS SIRI-VM which includes destination names

---

### Medium Priority

#### 4. Unused SIRI-VM Code
**File**: `src/lib/providers/bods-provider.ts:355-486`

**Problem**: There's comprehensive SIRI-VM parsing code that's never called. The `getArrivals` method uses GTFS-RT instead.

**What Needs to Be Done**:
- Evaluate if SIRI-VM gives better results
- Either use it or remove the dead code

#### 5. Unused BODS API Types
**File**: `src/lib/providers/bods-provider.ts:43-139`

**Problem**: Many interface types are defined but never used (NaptanStop, NaptanSearchResponse, etc.).

**What Needs to Be Done**:
- Remove unused types, or
- Implement features that use them

#### 6. Hard-coded Operator Mapping
**File**: `src/lib/gtfsrt-client.ts:216-235`

**Problem**: Operators are mapped by rough geographic regions. This is fragile.

```typescript
// Current approach:
if (lat >= 51.5 && lat <= 52.5 && lon >= 0.5 && lon <= 1.8) {
  return ['FECS', 'WNCT']; // First Essex and Ipswich Buses
}
```

**What Needs to Be Done**:
- Use a proper operator lookup service
- Or fetch all operators and filter by proximity

#### 7. Missing Error Feedback for Users
**Files**: Multiple locations

**Problem**: When BODS API fails or returns no data, users just see empty results without explanation.

**What Needs to Be Done**:
- Show "No buses found in this area" messages
- Indicate when data is estimated vs real-time

---

### Low Priority

#### 8. Prisma Not Used
**File**: `prisma/` directory, `package.json`

**Problem**: Prisma is installed but not integrated. No database functionality.

**What Needs to Be Done**:
- Remove Prisma if not needed, or
- Implement features that need a database (favorites, history)

#### 9. Console Logs in Production
**Files**: All client files (`naptan-client.ts`, `gtfsrt-client.ts`, etc.)

**Problem**: Many `console.log` and `console.warn` statements will show in production.

**What Needs to Be Done**:
- Use a proper logging library
- Or wrap logs in `process.env.NODE_ENV === 'development'`

#### 10. Magic Numbers Throughout
**Files**: Multiple

**Problem**: Numbers like `5000`, `6000`, `15000`, `300` scattered without explanation.

Examples:
- `AbortSignal.timeout(5000)` - Why 5 seconds?
- `MAX_SEARCH_RADIUS_KM = 5` - Why 5km?
- `AVERAGE_BUS_SPEED_KMH = 20` - Is this accurate?

**What Needs to Be Done**:
- Move to constants file with documentation
- Or add comments explaining choices

---

## Code Quality Issues

### 1. Duplicate Transformation Logic
Multiple places transform stop data. Should be unified:
- `bods-provider.ts:558-572` - `transformNaptanToStop()`
- `naptan-client.ts:63-117` - `transformNominatimToStop()`

### 2. Inconsistent Error Handling
Some errors return `success: false`, others return `success: true` with empty data.
Should standardize the approach.

### 3. Missing TypeScript Strict Checks
Some `any` types and loose typing could be tightened.

### 4. No Unit Tests
No test files exist. Critical logic should have tests:
- Haversine distance calculation
- Arrival time estimation
- Data transformation functions

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `TFL_API_KEY` | No | Higher TfL rate limits (500/min vs 50/min) |
| `BODS_API_KEY` | **Yes** | Required for Outside London arrivals |
| `DATABASE_URL` | No | Prisma (currently unused) |

---

## What's Working Well

1. **Clean separation** - Providers, hooks, and components are well-organized
2. **TypeScript** - Good type definitions in `types/tfl.ts`
3. **React Query** - Proper caching and refresh logic
4. **City theming** - Dynamic colors based on selected city
5. **Responsive UI** - Works well on mobile and desktop
6. **Error boundaries** - App doesn't crash on errors

---

## Recommended Next Steps

1. **Get BODS API Key** - Required for Outside London to work
2. **Fix BODS arrivals** - Use SIRI-VM for actual predictions
3. **Add line information** - Show which buses serve each stop
4. **Clean up unused code** - Remove dead SIRI-VM parsing or use it
5. **Add basic tests** - At least for core calculation functions

---

## Quick Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

*Last updated: January 2026*
