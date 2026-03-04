# Test Coverage Plan for dbAdapter Migration

## Current Test Coverage Analysis

### Existing Tests
- **Adapter Interface Tests**: Verify adapters implement required methods
- **Basic CRUD Tests**: Test adapter CRUD operations
- **Some DAL Tests**: `dal-queries.test.ts`, `dal-dashboard-functions.test.ts` (limited coverage)
- **Contract Tests**: Verify adapter behavior consistency

### Test Coverage Gaps

1. **DAL Functions**: ~143 exported functions in `dal.ts`, but only a few are tested
2. **Bible Bee Functions**: ~32 exported functions in `bibleBee.ts`, minimal test coverage
3. **Adapter Consistency**: No tests verifying both adapters produce identical results
4. **Migration Path**: Tests still mock direct `db.*` instead of testing through `dbAdapter`
5. **Conditional Logic**: Functions using `shouldUseAdapter()` aren't tested for both paths
6. **Complex Queries**: Filtering, transactions, and complex operations need better coverage

## Test Strategy

### Phase 1: Create Parameterized Test Framework

**Goal**: Create reusable test utilities that work with both adapters

**Files to create:**
- `__tests__/lib/dal-adapter-test-helpers.ts` - Test utilities for adapter testing
- `__tests__/lib/dal-comprehensive.test.ts` - Comprehensive DAL function tests

**Key features:**
- Parameterized tests that run against both IndexedDBAdapter and SupabaseAdapter
- Test data factories
- Helper functions for setting up test scenarios
- Comparison utilities to verify identical results from both adapters

### Phase 2: Test Core DAL Functions

**Priority functions to test** (from `src/lib/dal.ts`):

1. **Household Functions**:
   - `queryHouseholdList()` - Already partially tested, needs adapter version
   - `getHouseholdForUser()` - Needs test
   - `fetchFullHouseholdData()` - Needs test
   - `registerHousehold()` - Critical, needs comprehensive test

2. **Query Functions**:
   - `querySundaySchoolRoster()` - Tested but uses direct db mocks
   - `queryRostersForMinistry()` - Tested but uses direct db mocks
   - `queryDashboardMetrics()` - Tested but uses direct db mocks
   - `isEligibleForChoir()` - Needs test
   - `isWithinWindow()` - Needs test

3. **Dashboard Functions**:
   - `getCheckedInCount()` - Basic test exists, needs adapter version
   - `getRegistrationStats()` - Basic test exists, needs adapter version
   - `getMinistries()` - Basic test exists, needs adapter version
   - `getUnacknowledgedIncidents()` - Basic test exists, needs adapter version

4. **Bible Bee Functions** (from `src/lib/bibleBee.ts`):
   - `createCompetitionYear()` - Needs test
   - `upsertScripture()` - Needs test
   - `getApplicableGradeRule()` - Needs test
   - `getChildDivisionInfo()` - Needs test
   - `enrollChildInBibleBee()` - Critical, needs test
   - `toggleScriptureCompletion()` - Needs test
   - `submitEssay()` - Needs test

5. **Leader Profile Functions**:
   - `queryLeaderProfiles()` - Needs test
   - `searchLeaderProfiles()` - Needs test
   - Various leader-related functions

6. **Transaction Functions**:
   - `registerHousehold()` - Uses transactions, needs comprehensive test
   - Any other transaction-based operations

### Phase 3: Test Adapter Consistency

**Goal**: Ensure both adapters produce identical results

**Test approach:**
1. Create test scenarios with sample data
2. Run same operation through both adapters
3. Compare results (structure, values, ordering)
4. Verify error handling is consistent

**Test file**: `__tests__/lib/adapter-consistency.test.ts`

**Key scenarios:**
- CRUD operations produce same results
- Filtering produces same results
- Transactions behave consistently
- Error cases handled identically
- Edge cases (empty results, null values, etc.)

### Phase 4: Test Migration Path

**Goal**: Verify functions work correctly when using `dbAdapter` instead of direct `db.*`

**Test approach:**
1. Test functions that currently use `shouldUseAdapter()` conditionals
2. Verify both paths (adapter vs direct) produce same results
3. Test functions that will be migrated from direct Dexie to adapter

**Test file**: `__tests__/lib/dal-migration-path.test.ts`

**Key functions to test:**
- Functions in `dal.ts` that use `shouldUseAdapter()`
- Functions that use direct `db.*` queries
- Verify adapter methods exist for all needed operations

### Phase 5: Test Complex Scenarios

**Goal**: Test real-world usage patterns

**Scenarios:**
1. **Registration Flow**: Full household registration with children, guardians, enrollments
2. **Bible Bee Enrollment**: Child enrollment with scripture assignments
3. **Attendance Tracking**: Check-in/check-out with filtering
4. **Ministry Management**: Creating ministries, enrollments, rosters
5. **Leader Management**: Creating leaders, assigning to ministries

**Test file**: `__tests__/lib/dal-integration-scenarios.test.ts`

### Phase 6: Test Error Handling

**Goal**: Ensure consistent error handling across adapters

**Scenarios:**
- Not found errors (404/null returns)
- Validation errors
- Network errors (Supabase)
- Transaction failures
- Constraint violations

**Test file**: `__tests__/lib/adapter-error-handling.test.ts`

## Implementation Details

### Test Structure

```typescript
// Example parameterized test structure
describe.each([
  ['IndexedDBAdapter', () => new IndexedDBAdapter(testDb)],
  ['SupabaseAdapter', () => new SupabaseAdapter(url, key, mockSupabase)],
])('DAL Functions - %s', (adapterName, createAdapter) => {
  let adapter: DatabaseAdapter;
  
  beforeEach(() => {
    adapter = createAdapter();
    // Setup test data
  });
  
  describe('queryHouseholdList', () => {
    it('should return households with children', async () => {
      // Test implementation
    });
  });
});
```

### Test Data Management

- Use factories for creating test data
- Clean up after each test
- Use isolated test databases/instances
- Support both adapter types

### Mock Strategy

- **IndexedDBAdapter**: Use `createInMemoryDB()` from test utils
- **SupabaseAdapter**: Use `createSupabaseMock()` from test utils
- Ensure mocks support all needed operations

## Test Files to Create/Update

### New Test Files

1. `__tests__/lib/dal-adapter-test-helpers.ts`
   - Test utilities and factories
   - Adapter comparison utilities
   - Test data factories

2. `__tests__/lib/dal-comprehensive.test.ts`
   - Comprehensive tests for all DAL functions
   - Parameterized for both adapters

3. `__tests__/lib/bible-bee-comprehensive.test.ts`
   - Tests for all Bible Bee functions
   - Parameterized for both adapters

4. `__tests__/lib/adapter-consistency.test.ts`
   - Tests verifying both adapters produce identical results

5. `__tests__/lib/dal-migration-path.test.ts`
   - Tests for functions using `shouldUseAdapter()`
   - Verify migration path works

6. `__tests__/lib/dal-integration-scenarios.test.ts`
   - End-to-end scenarios
   - Real-world usage patterns

7. `__tests__/lib/adapter-error-handling.test.ts`
   - Error handling tests
   - Edge cases

### Files to Update

1. `__tests__/lib/dal-queries.test.ts`
   - Update to use `dbAdapter` instead of direct `db.*` mocks
   - Add adapter parameterization

2. `__tests__/lib/dal-dashboard-functions.test.ts`
   - Enhance with more comprehensive tests
   - Add adapter consistency checks

3. `__tests__/lib/dal-utils.test.ts`
   - Update to test through adapters

## Success Criteria

1. **Coverage**: All DAL functions have tests
2. **Adapter Testing**: All tests work with both adapters
3. **Consistency**: Tests verify both adapters produce identical results
4. **Migration Ready**: Tests verify migration path works
5. **Regression Prevention**: Tests catch any behavior changes

## Execution Order

1. **Week 1**: Create test framework and helpers
2. **Week 2**: Add comprehensive DAL function tests
3. **Week 3**: Add Bible Bee function tests
4. **Week 4**: Add adapter consistency and integration tests
5. **Week 5**: Update existing tests and fill gaps

## Notes

- Tests should be fast (use mocks, not real databases)
- Tests should be isolated (clean state between tests)
- Tests should be maintainable (use factories and helpers)
- Tests should catch regressions (comprehensive assertions)
- Tests should document expected behavior (clear test names and descriptions)
