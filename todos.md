# Commute Copilot - Todo List

Track progress on improvements and fixes.

---

## High Priority

### 1. Fix BODS Arrivals (SIRI-VM Integration)
- **Status**: Completed
- **Files**: `src/lib/providers/bods-provider.ts`, `src/lib/gtfsrt-client.ts`
- **Problem**: Currently using GTFS-RT which estimates arrivals from GPS distance. Unreliable.
- **Solution**: Use existing SIRI-VM code that's already written but not called.

**Sub-tasks**:
- [x] Update `getArrivals()` method to call `getSiriVmArrivals()` instead of `gtfsrtClient`
- [x] Test SIRI-VM response parsing
- [x] Handle cases where SIRI-VM returns no data (fallback to GTFS-RT)
- [x] Verify API key requirement (BODS_API_KEY)

**Changes Made**:
- Updated `getArrivals()` in `bods-provider.ts` to:
  1. First try SIRI-VM API for vehicle data
  2. If SIRI-VM fails or returns no data, fall back to GTFS-RT estimates
- Fixed SIRI-VM endpoint URL: `/datafeed/` (not `/siri-vm`)
- Removed `Accept: application/xml` header (caused 406 error)
- SIRI-VM provides **real destination names** (e.g., "Cardiff Sophia Gardens")
- Added distance-based arrival estimation using vehicle positions
- Both APIs require `BODS_API_KEY` environment variable

**Tested & Verified**: API returns real bus lines and destinations for Outside London stops.

---

### 2. Fix Destination Names
- **Status**: Completed (via Task 1)
- **Files**: `src/lib/providers/bods-provider.ts:523`
- **Problem**: All arrivals show "Via this stop" instead of actual destination.
- **Solution**: SIRI-VM includes `DestinationName` field - use it.

**Sub-tasks**:
- [x] Confirm SIRI-VM response includes destination names
- [x] Update arrival transformation to use `DestinationName`
- [x] Add fallback for missing destinations

**Notes**: Solved by Task 1. The `extractArrivalFromActivity()` method already extracts `DestinationName` from SIRI-VM XML and falls back to "Unknown" if not present.

---

### 3. Add Bus Line Information for Outside London
- **Status**: Not Started
- **Files**: `src/lib/naptan-client.ts`
- **Problem**: Stops show empty `lines: []` - users can't see which buses serve a stop.
- **Solution**: Fetch line data from BODS or GTFS static data.

**Sub-tasks**:
- [ ] Research BODS API for line/route data
- [ ] Find endpoint that returns lines serving a stop
- [ ] Update `transformNominatimToStop()` to include lines
- [ ] Display lines on stop cards

---

### 4. Clean Up Unused SIRI-VM Code
- **Status**: Completed (via Task 1)
- **Files**: `src/lib/providers/bods-provider.ts:370-509`
- **Problem**: ~130 lines of SIRI-VM parsing code exists but never called.
- **Solution**: Either integrate it (Task 1) or remove it.

**Sub-tasks**:
- [x] If Task 1 completed: Mark as done (code now used)
- [ ] ~~If Task 1 not viable: Remove dead code~~

**Notes**: SIRI-VM code is now actively used. The `getSiriVmArrivals()` and related parsing methods are called by `getArrivals()`.

---

### 5. Remove Unused Interface Types
- **Status**: Not Started
- **Files**: `src/lib/providers/bods-provider.ts:114-139`
- **Problem**: `NaptanStop`, `NaptanSearchResponse` types defined but never used.
- **Solution**: Remove unused types.

**Sub-tasks**:
- [ ] Verify types are truly unused (grep for usage)
- [ ] Remove unused interfaces
- [ ] Run TypeScript check to confirm no breaks

---

## Medium Priority

### 6. Fix Hard-coded Operator Mapping
- **Status**: Not Started
- **Files**: `src/lib/gtfsrt-client.ts:216-235`
- **Problem**: Operators mapped by rough geographic regions - fragile approach.

**Sub-tasks**:
- [ ] Research better operator lookup method
- [ ] Implement dynamic operator detection
- [ ] Remove hard-coded region checks

---

### 7. Add User Feedback for Empty Results
- **Status**: Not Started
- **Files**: Multiple components
- **Problem**: When BODS returns no data, users see empty results without explanation.

**Sub-tasks**:
- [ ] Add "No buses found" message for empty arrivals
- [ ] Indicate when data is estimated vs real-time
- [ ] Show helpful message when outside coverage area

---

### 8. Clean Up Console Logs
- **Status**: Not Started
- **Files**: All lib files
- **Problem**: Console logs will show in production.

**Sub-tasks**:
- [ ] Wrap logs in development check, or
- [ ] Implement proper logging utility
- [ ] Remove unnecessary debug logs

---

## Low Priority

### 9. Remove or Use Prisma
- **Status**: Not Started
- **Problem**: Prisma installed but not used.

**Sub-tasks**:
- [ ] Decide: Remove Prisma or implement DB features (favorites, history)
- [ ] If removing: `npm uninstall prisma @prisma/client`, delete `prisma/` folder

---

### 10. Add Unit Tests
- **Status**: Not Started
- **Problem**: No tests exist for critical logic.

**Sub-tasks**:
- [ ] Set up testing framework (Jest/Vitest)
- [ ] Test haversine distance calculation
- [ ] Test arrival time estimation
- [ ] Test data transformation functions

---

### 11. Document Magic Numbers
- **Status**: Not Started
- **Problem**: Numbers like `5000`, `15000`, `300` scattered without explanation.

**Sub-tasks**:
- [ ] Create constants file with documented values
- [ ] Replace magic numbers with named constants

---

## Completed

_Move completed tasks here with completion date_

<!-- Example:
### Task Name
- **Completed**: 2026-01-15
- **Notes**: What was done, any follow-up needed
-->

---

## Notes

- **BODS_API_KEY required** for Outside London functionality
- Tasks 1, 2, 4 are related - fixing SIRI-VM integration solves all three
- Always run `npm run build` after changes to check for TypeScript errors

---

*Last updated: January 12, 2026 - Completed Tasks 1, 2, 4 (SIRI-VM fully working with real destinations)*
