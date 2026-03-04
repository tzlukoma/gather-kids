---
name: Fix dbAdapter Pattern Usage
overview: Remove all conditional `shouldUseAdapter()` checks and direct Dexie queries, replacing them with consistent `dbAdapter` usage across both demo and live modes. The adapter pattern should work seamlessly for both IndexedDB (demo) and Supabase (live) modes.
todos:
  - id: remove-should-use-adapter
    content: Remove shouldUseAdapter() conditional pattern - always use dbAdapter for both demo and live modes
    status: pending
  - id: migrate-dal-core
    content: Migrate src/lib/dal.ts core functions to use dbAdapter instead of direct Dexie queries
    status: pending
  - id: migrate-bible-bee-legacy
    content: Fix Bible Bee legacy table usage (competitionYears → bible_bee_cycles) in src/lib/bibleBee.ts
    status: pending
  - id: migrate-bible-bee-hooks
    content: Migrate Bible Bee hooks (src/hooks/data/bibleBee.ts, src/lib/hooks/useBibleBee.ts) to use dbAdapter
    status: pending
  - id: handle-transactions
    content: Update transaction usage to use dbAdapter.transaction() instead of direct Dexie transactions
    status: pending
  - id: verify-adapter-coverage
    content: Verify IndexedDBAdapter and SupabaseAdapter implement all needed methods with proper filtering
    status: pending
  - id: update-components
    content: Update components using direct db.* access to use dbAdapter
    status: pending
  - id: test-both-modes
    content: Test all changes work correctly in both demo (IndexedDB) and live (Supabase) modes
    status: pending
isProject: false
---

# Fix dbAdapter Pattern Usage

## Problem Analysis

The codebase has inconsistent database access patterns:

1. **Incorrect conditional usage**: Many functions use `shouldUseAdapter()` to branch between adapter and direct Dexie access, when they should ALWAYS use `dbAdapter` for both modes
2. **Direct Dexie queries**: Hundreds of direct Dexie queries (`db.tableName.toArray()`, `db.tableName.get()`, etc.) that bypass the adapter
3. **Legacy table names**: Code uses `competitionYears` (Dexie) vs `bible_bee_cycles` (adapter) - needs unification
4. **Missing adapter methods**: Some operations may need new adapter methods

## Architecture Understanding

- **IndexedDBAdapter**: Wraps Dexie and implements `DatabaseAdapter` interface - works for demo mode
- **SupabaseAdapter**: Wraps Supabase and implements `DatabaseAdapter` interface - works for live mode  
- **Factory**: `createDatabaseAdapter()` selects the appropriate adapter based on `NEXT_PUBLIC_DATABASE_MODE`
- **Key principle**: `dbAdapter` should work identically for BOTH demo and live modes

## Implementation Plan

### Phase 1: Remove `shouldUseAdapter()` Pattern

**Files to update:**

- `src/lib/dal.ts` - Remove all `shouldUseAdapter()` conditionals, always use `dbAdapter`
- `src/hooks/data/bibleBee.ts` - Remove conditionals, use adapter methods
- `src/lib/hooks/useBibleBee.ts` - Remove conditionals, use adapter methods
- `src/lib/bibleBee.ts` - Replace direct Dexie with adapter calls

**Changes:**

1. Remove `shouldUseAdapter()` function from `src/lib/dal.ts` (or deprecate it)
2. Replace all `if (shouldUseAdapter()) { dbAdapter... } else { db... }` patterns with direct `dbAdapter...` calls
3. Ensure IndexedDBAdapter properly implements all needed methods

### Phase 2: Replace Direct Dexie Queries in DAL

**File: `src/lib/dal.ts`**

Replace direct queries with adapter methods:

- `db.households.get()` → `dbAdapter.getHousehold()`
- `db.households.toArray()` → `dbAdapter.listHouseholds()`
- `db.children.get()` → `dbAdapter.getChild()`
- `db.children.where(...).toArray()` → `dbAdapter.listChildren({ filters })`
- `db.ministries.get()` → `dbAdapter.getMinistry()`
- `db.ministries.toArray()` → `dbAdapter.listMinistries()`
- `db.attendance.where(...)` → `dbAdapter.listAttendance({ filters })`
- `db.registrations.where(...)` → `dbAdapter.listRegistrations({ filters })`
- `db.ministry_enrollments.where(...)` → `dbAdapter.listMinistryEnrollments(...)`

**Specific functions to update:**

- `isEligibleForChoir()` - lines 97-109
- `isWithinWindow()` - lines 111-120
- `querySundaySchoolRoster()` - lines 126-136
- `queryRostersForMinistry()` - lines 138-151
- `queryDashboardMetrics()` - lines 153-196
- `queryHouseholdList()` - lines 198-344 (already partially migrated)
- `fetchFullHouseholdData()` - lines 620-656
- `registerHousehold()` - lines 841-1052 (uses transactions)
- `getCheckedInCount()` - lines 3083-3109 (already partially migrated)
- `getRegistrationStats()` - lines 3114-3153
- `getMinistries()` - lines 4129-4166 (already partially migrated)
- All other functions using direct `db.`* access

### Phase 3: Fix Bible Bee Legacy Tables

**Problem**: Code uses `competitionYears` table (Dexie) but adapter uses `bible_bee_cycles`

**Files affected:**

- `src/lib/bibleBee.ts` - Uses `db.competitionYears` and `db.scriptures` with `competitionYearId`
- `src/hooks/data/bibleBee.ts` - Uses `db.competitionYears`, `db.enrollments`, `db.studentScriptures`, `db.studentEssays`
- `src/lib/hooks/useBibleBee.ts` - Uses `db.competitionYears`, `db.scriptures`

**Solution:**

1. Map `competitionYears` to `bible_bee_cycles` in adapter usage
2. Update `bibleBee.ts` to use:
  - `dbAdapter.listBibleBeeCycles()` instead of `db.competitionYears.toArray()`
  - `dbAdapter.listScriptures({ cycleId })` instead of `db.scriptures.where('competitionYearId')`
  - `dbAdapter.listEnrollments({ bibleBeeYearId })` instead of `db.enrollments.where(...)`
  - `dbAdapter.listStudentScriptures(childId, cycleId)` instead of `db.studentScriptures.where(...)`
  - `dbAdapter.listStudentEssays(childId, cycleId)` instead of `db.studentEssays.where(...)`

**Note**: May need to add adapter methods for:

- `getCompetitionYearByYear(year: number)` - if needed
- `listScripturesByCompetitionYearId(yearId: string)` - if `competitionYearId` differs from `cycleId`

### Phase 4: Update Hooks and Components

**Files:**

- `src/hooks/data/bibleBee.ts` - Replace all direct Dexie queries
- `src/lib/hooks/useBibleBee.ts` - Replace all direct Dexie queries  
- `src/components/gatherKids/incident-form.tsx` - Replace `db.children.where(...)`
- Any other components using direct `db.`* access

**Pattern to follow:**

```typescript
// Before
const children = await db.children.where('child_id').anyOf(childIds).toArray();

// After  
const children = await dbAdapter.listChildren({ 
  // Note: may need to filter in-memory if adapter doesn't support anyOf filter
});
```

### Phase 5: Handle Transactions

**Problem**: Some operations use Dexie transactions (`db.transaction()`)

**Files:**

- `src/lib/dal.ts` - `registerHousehold()` uses `runDexieTransaction()`
- `src/lib/seed.ts` - Uses transactions for seeding

**Solution:**

1. Use `dbAdapter.transaction()` method (already in interface)
2. Ensure both adapters properly implement transactions
3. IndexedDBAdapter should use Dexie transactions internally
4. SupabaseAdapter should use Supabase transactions or batch operations

### Phase 6: Update Seed Scripts

**Files:**

- `src/lib/seed.ts` - Uses direct Dexie `bulkPut`, `bulkAdd`
- `src/lib/seedBibleBee.ts` - Uses direct Dexie access

**Solution:**

- Seed scripts can continue using direct Dexie for now (they're dev-only)
- OR migrate to use adapter for consistency
- Document that seed scripts are demo-mode only

### Phase 7: Verify Adapter Coverage

**Check that IndexedDBAdapter implements:**

- All methods used in migration
- Proper filtering support (may need in-memory filtering for complex queries)
- Transaction support

**Check that SupabaseAdapter implements:**

- All equivalent methods
- Proper error handling
- Filter support matching IndexedDBAdapter behavior

### Phase 8: Testing Strategy

1. **Unit tests**: Ensure adapter methods work for both adapters
2. **Integration tests**: Test DAL functions with both adapters
3. **Manual testing**:
  - Test in demo mode (IndexedDB)
  - Test in live mode (Supabase)
  - Verify data consistency

## Migration Order

1. Start with `src/lib/dal.ts` - core data access layer
2. Then `src/lib/bibleBee.ts` - Bible Bee specific logic
3. Then hooks: `src/hooks/data/bibleBee.ts`, `src/lib/hooks/useBibleBee.ts`
4. Then components using direct DB access
5. Finally, update seed scripts (lowest priority)

## Key Considerations

1. **Filter support**: Some Dexie queries use complex filters (`.anyOf()`, `.and()`, etc.). The adapter may need in-memory filtering for these cases.
2. **Performance**: IndexedDBAdapter should maintain performance by using Dexie internally, just through the adapter interface.
3. **Backward compatibility**: During migration, ensure both modes continue working. Consider feature flags if needed.
4. **Error handling**: Ensure consistent error handling across both adapters.
5. **Type safety**: Maintain TypeScript types throughout migration.

## Success Criteria

- No `shouldUseAdapter()` conditionals remain (except possibly in factory)
- No direct `db.tableName.`* queries outside of adapter implementations
- All database operations go through `dbAdapter`
- Both demo and live modes work identically
- Tests pass for both adapters
- No performance regression

## Files Summary

**High Priority (Core DAL):**

- `src/lib/dal.ts` (~1300+ lines, many direct queries)
- `src/lib/bibleBee.ts` (~1500+ lines, many direct queries)

**Medium Priority (Hooks):**

- `src/hooks/data/bibleBee.ts` (~1000+ lines)
- `src/lib/hooks/useBibleBee.ts` (~700+ lines)

**Lower Priority (Components/Utils):**

- `src/components/gatherKids/incident-form.tsx`
- `src/lib/seed.ts` (dev-only)
- `src/lib/seedBibleBee.ts` (dev-only)

