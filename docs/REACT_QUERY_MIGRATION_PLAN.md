<!-- Migration Plan Tracking Document -->

# React Query Migration Plan - Modular Approach

## Progress Tracking

**IMPORTANT:** As each module is completed, check off the items in this plan file by replacing `- [ ]` with `- [x]`. This plan file will be saved to `/docs/REACT_QUERY_MIGRATION_PLAN.md` and updated throughout execution to track progress.

## Migration Strategy

Each module is a self-contained unit of work that:

1. Creates new code alongside existing code (zero breaking changes)
2. Includes its own test verification step
3. Must pass ALL existing tests before commit
4. **MUST BE COMMITTED BEFORE STARTING THE NEXT MODULE**
5. Gets committed independently before next module begins

This ensures the codebase remains stable and working throughout the entire migration.

**CRITICAL REMINDER:** After completing each module, you MUST:

- Run `npm run build` to verify no build errors
- Commit all changes with a descriptive commit message
- Update the migration plan to mark the module as complete
- **NEVER START THE NEXT MODULE WITHOUT COMMITTING THE PREVIOUS ONE**

**WORKFLOW:** Complete Module → Test → Commit → Update Plan → Start Next Module

## File Organization Structure

### Hook Architecture

All React hooks are organized under `src/hooks/` with domain-based structure:

```
src/hooks/
├── data/                    # Data fetching hooks (React Query)
│   ├── keys.ts             # Central query key factory
│   ├── config.ts           # Cache configuration (staleTime, gcTime)
│   ├── children.ts         # Child-related queries
│   ├── households.ts       # Household, guardian, emergency contact queries
│   ├── attendance.ts       # Attendance and incident queries
│   ├── ministries.ts       # Ministry and enrollment queries
│   ├── registration.ts     # Registration cycle queries
│   ├── leaders.ts          # Leader profile queries
│   └── index.ts            # Barrel export
├── ui/                     # UI-related hooks
│   ├── use-toast.ts
│   ├── use-mobile.tsx
│   └── ...
└── index.ts               # Root barrel export for all hooks
```

### Skeleton Components

Loading skeletons are organized under `src/components/skeletons/`:

```
src/components/skeletons/
├── TableSkeleton.tsx           # Generic table loading skeleton
├── RosterSkeleton.tsx          # Roster-specific loading skeleton
├── CardGridSkeleton.tsx        # Card grid loading skeleton
├── BibleBeeProgressSkeleton.tsx # Bible Bee stats loading skeleton
├── admin-skeleton.tsx          # Admin dashboard skeleton
└── guardian-skeleton.tsx       # Guardian profile skeleton
```

Base skeleton component: `src/components/ui/skeleton.tsx`

### Import Conventions

**Before migration:**

```typescript
import { useGuardians } from '@/lib/hooks/useData';
import { useToast } from '@/hooks/use-toast';
```

**After migration:**

```typescript
import { useGuardians, useToast } from '@/hooks';
```

### Cache Key Hierarchy

Query keys follow a hierarchical structure for efficient invalidation:

```typescript
// Event-scoped for granular invalidation
queryKeys.attendance(date, eventId); // ['attendance', '2024-01-15', 'evt_sunday_school']
queryKeys.incidents(date, eventId); // ['incidents', '2024-01-15', 'evt_sunday_school']

// Entity-scoped
queryKeys.child(id); // ['child', 'child-123']
queryKeys.household(id); // ['household', 'household-456']

// Collection-scoped
queryKeys.children(); // ['children']
queryKeys.leaders(); // ['leaders']
```

## Overall Approach

### Migration Principles

This migration standardizes all client-side data fetching on React Query, eliminating problematic patterns where components mixed React Query with direct DAL calls.

**Key Problems Being Solved:**

- Inconsistent caching and loading states
- Manual state management with useEffect
- Direct DAL calls bypassing React Query cache
- No cache invalidation strategy
- Scattered hook organization

**Migration Patterns:**

#### Pattern 1: Replace useEffect + useState with React Query

**Before:**

```typescript
const [incidents, setIncidents] = useState<Incident[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
	const loadIncidents = async () => {
		try {
			setLoading(true);
			const data = await getIncidentsForUser(user);
			setIncidents(data);
		} catch (error) {
			console.error('Error loading incidents:', error);
		} finally {
			setLoading(false);
		}
	};
	loadIncidents();
}, [user]);
```

**After:**

```typescript
const {
	data: incidents = [],
	isLoading: loading,
	error,
} = useIncidentsForUser(user);

if (error) {
	console.error('Error loading incidents:', error);
	return <div>Error loading incidents. Please try again.</div>;
}
```

#### Pattern 2: Loading Skeletons Instead of Simple Loading Text

**Before:**

```typescript
if (loading) return <div>Loading...</div>;
```

**After:**

```typescript
if (loading) return <TableSkeleton rows={8} columns={5} />;
```

**Skeleton Usage Examples:**

```typescript
// Table-based pages
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
if (loading) return <TableSkeleton rows={10} columns={4} />;

// Roster/List pages
import { RosterSkeleton } from '@/components/skeletons/RosterSkeleton';
if (loading) return <RosterSkeleton />;

// Card grid layouts
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';
if (loading) return <CardGridSkeleton cards={6} />;

// Bible Bee stats
import { BibleBeeProgressSkeleton } from '@/components/skeletons/BibleBeeProgressSkeleton';
if (isComputingStats) return <BibleBeeProgressSkeleton />;

// Custom inline skeletons
import { Skeleton } from '@/components/ui/skeleton';
{
	isLoading ? <Skeleton className="h-6 w-32" /> : <span>{data}</span>;
}
```

#### Pattern 3: Create Domain-Specific Hook Files

Each domain gets its own hook file in `src/hooks/data/`:

```typescript
// src/hooks/data/children.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllChildren, getChild } from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useChildren() {
	return useQuery({
		queryKey: queryKeys.children(),
		queryFn: getAllChildren,
		...cacheConfig.moderate,
	});
}

export function useChild(childId: string) {
	return useQuery({
		queryKey: queryKeys.child(childId),
		queryFn: () => getChild(childId),
		enabled: !!childId,
		...cacheConfig.moderate,
	});
}
```

#### Pattern 4: Smart Cache Configuration

Use appropriate staleTime based on data volatility:

```typescript
export const cacheConfig = {
	reference: { staleTime: 10 * 60 * 1000, gcTime: 20 * 60 * 1000 }, // 10min - Rarely changes
	moderate: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 }, // 5min - Changes occasionally
	volatile: { staleTime: 1 * 60 * 1000, gcTime: 5 * 60 * 1000 }, // 1min - Changes frequently
};

// Usage:
useChildren(); // moderate - child list changes occasionally
useAttendance(); // volatile - attendance changes during events
useMinistries(); // reference - ministry config rarely changes
```

#### Pattern 5: Mutation Hooks with Smart Invalidation

```typescript
export function useAcknowledgeIncident() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: acknowledgeIncident,
		onSuccess: () => {
			// Invalidate all incidents queries to refresh data
			queryClient.invalidateQueries({ queryKey: ['incidents'] });
		},
	});
}
```

### For Future Agents

When continuing this migration:

1. **Analyze the page** - Identify all data fetching patterns (useEffect, useState, direct DAL calls)
2. **Create hooks** - Add new hooks to appropriate `src/hooks/data/*.ts` file
3. **Update query keys** - Add any new keys to `src/hooks/data/keys.ts`
4. **Migrate the page** - Replace legacy patterns with React Query hooks
5. **Add loading skeletons** - Replace "Loading..." text with appropriate skeleton components
6. **Test thoroughly** - Run `npm run build` to verify no errors
7. **Commit immediately** - Never proceed to next module without committing
8. **Update this plan** - Mark module as complete in Module Status section

**The Check-In View (`src/app/dashboard/check-in/page.tsx`) and Rosters Page (`src/app/dashboard/rosters/page.tsx`) serve as perfect exemplars of React Query usage patterns.**

## Module Status

- [x] MODULE 1: Foundation Infrastructure (keys, config)
- [x] MODULE 2: Skeleton Components
- [x] MODULE 3: Children Data Hooks
- [x] MODULE 4: Households & Guardians Hooks
- [x] MODULE 5: Attendance & Incidents Hooks
- [x] MODULE 6: Ministry Hooks
- [x] MODULE 7: Registration Hooks
- [x] MODULE 8: Migrate Roster Page (FIRST REAL MIGRATION)
- [x] MODULE 9a: Incidents Page
- [x] MODULE 9b: Registrations Page
- [x] MODULE 9c: Reports Page
- [x] MODULE 9d: Leaders Page
- [x] MODULE 9e: Ministries Page
- [x] MODULE 9f: Main Dashboard Page
- [x] MODULE 9g: Users Management Page
- [x] MODULE 9h: Check-In Page
- [ ] MODULE 9i: Branding Page
- [ ] MODULE 10: Bible Bee Hooks
- [ ] MODULE 11a: Bible Bee Main Page
- [ ] MODULE 11b: Bible Bee Progress List Component
- [ ] MODULE 11c: Bible Bee Detail Component
- [ ] MODULE 12: Barrel Exports
- [ ] MODULE 13: Update Imports
- [ ] MODULE 14: Documentation
- [ ] FINAL: Final Validation

---

## MODULE 1: Foundation Infrastructure

**Goal:** Set up core infrastructure without touching any existing code

### Files to Create:

- `src/hooks/data/keys.ts` - Query key factory
- `src/hooks/data/config.ts` - Cache configuration
- `src/hooks/data/` directory structure

### Implementation:

**Create `src/hooks/data/keys.ts`:**

```typescript
export const queryKeys = {
	children: () => ['children'] as const,
	child: (id: string) => ['child', id] as const,
	households: () => ['households'] as const,
	household: (id: string) => ['household', id] as const,
	householdProfile: (id: string) => ['householdProfile', id] as const,
	guardians: () => ['guardians'] as const,

	// Event-scoped attendance for granular invalidation
	attendance: (date: string, eventId?: string) =>
		eventId ? ['attendance', date, eventId] : ['attendance', date],
	incidents: (date: string, eventId?: string) =>
		eventId ? ['incidents', date, eventId] : ['incidents', date],

	// Bible Bee
	bibleBeeCycles: () => ['bibleBeeCycles'] as const,
	scriptures: (cycleId: string) => ['scriptures', cycleId] as const,
	studentAssignments: (childId: string) =>
		['studentAssignments', childId] as const,

	// Ministries
	ministries: () => ['ministries'] as const,
	ministryEnrollments: (cycleId: string) =>
		['ministryEnrollments', cycleId] as const,

	// Registration
	registrationCycles: () => ['registrationCycles'] as const,
	ministryGroups: () => ['ministryGroups'] as const,

	// Leaders
	leaders: () => ['leaders'] as const,
	leader: (id: string) => ['leader', id] as const,
	leaderSearch: (term: string) => ['leaderSearch', term] as const,
};
```

**Create `src/hooks/data/config.ts`:**

```typescript
export const cacheConfig = {
	reference: { staleTime: 10 * 60 * 1000, gcTime: 20 * 60 * 1000 },
	moderate: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 },
	volatile: { staleTime: 1 * 60 * 1000, gcTime: 5 * 60 * 1000 },
};
```

### Testing:

- Run `npm run build` - verify no build errors
- Run `npm test` - all 454+ tests must pass
- Verify imports work: `import { queryKeys } from '@/hooks/data/keys'`

### Commit Message:

```
feat: add React Query infrastructure (keys, config)

- Create query key factory with hierarchical structure
- Add cache configuration for different data types
- Set up hooks/data directory structure
- No changes to existing functionality
```

---

## MODULE 2: Skeleton Components ✅ COMPLETED

**Goal:** Create reusable loading skeleton components for better UX during data loading

### Files Created:

- `src/components/ui/skeleton.tsx` - Base skeleton component
- `src/components/skeletons/TableSkeleton.tsx` - Table loading skeleton
- `src/components/skeletons/RosterSkeleton.tsx` - Roster loading skeleton
- `src/components/skeletons/CardGridSkeleton.tsx` - Card grid skeleton
- `src/components/skeletons/BibleBeeProgressSkeleton.tsx` - Bible Bee stats skeleton
- `src/components/skeletons/admin-skeleton.tsx` - Admin dashboard skeleton
- `src/components/skeletons/guardian-skeleton.tsx` - Guardian profile skeleton

### Usage Pattern:

**Replace simple loading states:**

```typescript
// Before
if (loading) return <div>Loading...</div>;

// After
if (loading) return <TableSkeleton rows={8} columns={5} />;
```

### Benefits:

- Better perceived performance
- Professional loading experience
- Consistent loading states across application
- Reduced layout shift

### Status: ✅ COMPLETED

This module was completed early in the migration process and all skeleton components are available for use in subsequent page migrations.

---

## MODULE 3: Children Data Hooks ✅ COMPLETED

**Goal:** Create React Query hooks for children data

### Files Created:

- `src/hooks/data/children.ts` - Children-related React Query hooks

### Implementation:

**Create `src/hooks/data/children.ts`:**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllChildren, getChild } from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useChildren() {
	return useQuery({
		queryKey: queryKeys.children(),
		queryFn: getAllChildren,
		...cacheConfig.moderate,
	});
}

export function useChild(childId: string) {
	return useQuery({
		queryKey: queryKeys.child(childId),
		queryFn: () => getChild(childId),
		enabled: !!childId,
		...cacheConfig.moderate,
	});
}
```

### Benefits:

- Centralized children data fetching
- Automatic caching with 5-minute stale time
- Consistent loading and error states
- Type-safe query keys

### Status: ✅ COMPLETED

This module was completed early in the migration process and provides the foundation for children-related data fetching.

---

## MODULE 4: Households & Guardians Hooks ✅ COMPLETED

**Goal:** Create React Query hooks for household and guardian data

### Files Created:

- `src/hooks/data/households.ts` - Household and guardian-related React Query hooks

### Implementation:

**Create `src/hooks/data/households.ts`:**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import {
	getAllHouseholds,
	getHousehold,
	getHouseholdProfile,
	getAllGuardians,
	getAllEmergencyContacts,
} from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useHouseholds() {
	return useQuery({
		queryKey: queryKeys.households(),
		queryFn: getAllHouseholds,
		...cacheConfig.moderate,
	});
}

export function useHousehold(householdId: string) {
	return useQuery({
		queryKey: queryKeys.household(householdId),
		queryFn: () => getHousehold(householdId),
		enabled: !!householdId,
		...cacheConfig.moderate,
	});
}

export function useHouseholdProfile(householdId: string) {
	return useQuery({
		queryKey: queryKeys.householdProfile(householdId),
		queryFn: () => getHouseholdProfile(householdId),
		enabled: !!householdId,
		...cacheConfig.moderate,
	});
}

export function useGuardians() {
	return useQuery({
		queryKey: queryKeys.guardians(),
		queryFn: getAllGuardians,
		...cacheConfig.moderate,
	});
}

export function useEmergencyContacts() {
	return useQuery({
		queryKey: queryKeys.emergencyContacts(),
		queryFn: getAllEmergencyContacts,
		...cacheConfig.moderate,
	});
}
```

### Status: ✅ COMPLETED

This module provides comprehensive household and guardian data fetching capabilities.

---

## MODULE 5: Attendance & Incidents Hooks ✅ COMPLETED

**Goal:** Create React Query hooks for attendance and incident data with event-scoped caching

### Files Created:

- `src/hooks/data/attendance.ts` - Attendance and incident-related React Query hooks

### Implementation:

**Create `src/hooks/data/attendance.ts`:**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { getAttendanceForDate, getIncidentsForDate } from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useAttendance(date: string, eventId?: string) {
	return useQuery({
		queryKey: queryKeys.attendance(date, eventId),
		queryFn: () => getAttendanceForDate(date, eventId),
		enabled: !!date,
		...cacheConfig.volatile, // Attendance changes frequently
	});
}

export function useIncidents(date: string, eventId?: string) {
	return useQuery({
		queryKey: queryKeys.incidents(date, eventId),
		queryFn: () => getIncidentsForDate(date, eventId),
		enabled: !!date,
		...cacheConfig.volatile, // Incidents change frequently
	});
}
```

### Key Features:

- Event-scoped cache keys for granular invalidation
- Volatile cache configuration (1-minute stale time)
- Support for both date-only and event-specific queries

### Status: ✅ COMPLETED

This module provides event-scoped attendance and incident data fetching with smart cache invalidation.

---

## MODULE 6: Ministry Hooks ✅ COMPLETED

**Goal:** Create React Query hooks for ministry-related data

### Files Created:

- `src/hooks/data/ministries.ts` - Ministry-related React Query hooks

### Implementation:

**Create `src/hooks/data/ministries.ts`:**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import {
	getMinistries,
	getMinistriesByGroupCode,
	getMinistriesInGroup,
	getMinistryEnrollmentsByCycle,
	getMinistryGroups,
	getMinistryGroup,
	getGroupsForMinistry,
} from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useMinistries(isActive?: boolean) {
	return useQuery({
		queryKey: queryKeys.ministries(),
		queryFn: () => getMinistries(isActive),
		...cacheConfig.reference, // Ministries change infrequently
	});
}

export function useMinistriesByGroupCode(groupCode: string) {
	return useQuery({
		queryKey: queryKeys.ministriesByGroupCode(groupCode),
		queryFn: () => getMinistriesByGroupCode(groupCode),
		enabled: !!groupCode,
		...cacheConfig.reference,
	});
}

export function useMinistriesInGroup(groupId: string) {
	return useQuery({
		queryKey: queryKeys.ministriesInGroup(groupId),
		queryFn: () => getMinistriesInGroup(groupId),
		enabled: !!groupId,
		...cacheConfig.reference,
	});
}

export function useMinistryEnrollments(cycleId: string) {
	return useQuery({
		queryKey: queryKeys.ministryEnrollments(cycleId),
		queryFn: () => getMinistryEnrollmentsByCycle(cycleId),
		enabled: !!cycleId,
		...cacheConfig.moderate, // Enrollments change occasionally
	});
}

export function useMinistryGroups() {
	return useQuery({
		queryKey: queryKeys.ministryGroups(),
		queryFn: getMinistryGroups,
		...cacheConfig.reference,
	});
}

export function useMinistryGroup(id: string) {
	return useQuery({
		queryKey: queryKeys.ministryGroup(id),
		queryFn: () => getMinistryGroup(id),
		enabled: !!id,
		...cacheConfig.reference,
	});
}

export function useGroupsForMinistry(ministryId: string) {
	return useQuery({
		queryKey: queryKeys.groupsForMinistry(ministryId),
		queryFn: () => getGroupsForMinistry(ministryId),
		enabled: !!ministryId,
		...cacheConfig.reference,
	});
}
```

### Status: ✅ COMPLETED

This module provides comprehensive ministry data fetching with appropriate cache configurations.

---

## MODULE 7: Registration Hooks ✅ COMPLETED

**Goal:** Create React Query hooks for registration-related data

### Files Created:

- `src/hooks/data/registration.ts` - Registration-related React Query hooks

### Implementation:

**Create `src/hooks/data/registration.ts`:**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import {
	getRegistrationCycles,
	getRegistrationCycle,
	getRegistrationStats,
} from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useRegistrationCycles(isActive?: boolean) {
	return useQuery({
		queryKey: queryKeys.registrationCycles(),
		queryFn: () => getRegistrationCycles(isActive),
		...cacheConfig.reference, // Registration cycles change infrequently
	});
}

export function useRegistrationCycle(id: string) {
	return useQuery({
		queryKey: queryKeys.registrationCycle(id),
		queryFn: () => getRegistrationCycle(id),
		enabled: !!id,
		...cacheConfig.reference,
	});
}

export function useRegistrationStats() {
	return useQuery({
		queryKey: queryKeys.registrationStats(),
		queryFn: getRegistrationStats,
		...cacheConfig.moderate, // Stats change occasionally
	});
}
```

### Status: ✅ COMPLETED

This module provides registration cycle and statistics data fetching capabilities.

---

## MODULE 8: Migrate Roster Page ✅ COMPLETED

**Goal:** Migrate the first page to use React Query hooks (FIRST REAL MIGRATION)

### Files Modified:

- `src/app/dashboard/rosters/page.tsx` - Migrated to use React Query hooks

### Key Changes:

- Replaced manual `useState`/`useEffect` patterns with React Query hooks
- Integrated `useQueryClient` for cache invalidation on mutations
- Replaced text-based loading with `RosterSkeleton` component
- Used `useChildren`, `useHouseholds`, `useGuardians`, `useAttendance`, `useIncidents`, `useEmergencyContacts`

### Status: ✅ COMPLETED

This module serves as the exemplar for React Query migration patterns and demonstrates the complete integration of hooks with UI components.

---

## MODULE 9a: Incidents Page ✅ COMPLETED

**Goal:** Migrate incidents page to React Query

### Files Modified:

- `src/app/dashboard/incidents/page.tsx` - Migrated to use React Query hooks
- `src/hooks/data/attendance.ts` - Added `useIncidentsForUser` and `useAcknowledgeIncident` hooks

### Key Changes:

- Added `useIncidentsForUser` hook for user-specific incident fetching
- Added `useAcknowledgeIncident` mutation hook with smart cache invalidation
- Replaced `useEffect`/`useState` pattern with React Query hooks
- Improved error handling with React Query's built-in error states

### Status: ✅ COMPLETED

This module demonstrates mutation patterns and user-specific data fetching.

---

## MODULE 9b: Registrations Page ✅ COMPLETED

**Goal:** Migrate registrations page to React Query

### Files Modified:

- `src/app/dashboard/registrations/page.tsx` - Migrated to use React Query hooks

### Key Changes:

- Replaced `useEffect`/`useState` pattern for ministries with `useMinistries` hook
- Combined loading states for ministries and households data
- Added error handling for ministries data
- Maintained all existing functionality (filtering, role-based access)

### Status: ✅ COMPLETED

This module demonstrates combining multiple React Query hooks and managing complex loading states.

---

## MODULE 9c: Reports Page ✅ COMPLETED

**Goal:** Migrate reports page to React Query

### Files Modified:

- `src/app/dashboard/reports/page.tsx` - Migrated to use React Query hooks
- `src/hooks/data/children.ts` - Added `useCheckedInChildren` hook
- `src/hooks/data/keys.ts` - Added `checkedInChildren` query key

### Key Changes:

- Added `useCheckedInChildren` hook for date-based checked-in children fetching
- Replaced `useEffect`/`useState` pattern with React Query hooks
- Added error handling for React Query errors
- Maintained all existing functionality (CSV exports, date range selection)

### Status: ✅ COMPLETED

This module demonstrates date-based data fetching and export functionality integration.

---

## MODULE 9d: Leaders Page

**Goal:** Migrate leaders page to React Query

### Files to Modify:

- `src/app/dashboard/leaders/page.tsx` - Migrate to use React Query hooks
- `src/hooks/data/leaders.ts` - Already created, update imports

### Current State Analysis:

The leaders page currently uses:

- `useLeaders()` and `useLeaderSearch()` from `@/lib/hooks/useData`
- Manual migration check with `migrateLeadersIfNeeded()`
- Legacy hook imports

### Implementation Steps:

1. **Update Imports:**

   ```typescript
   // Replace
   import { useLeaders, useLeaderSearch } from '@/lib/hooks/useData';

   // With
   import { useLeaders, useLeaderSearch } from '@/hooks/data/leaders';
   ```

2. **Add Loading Skeleton:**

   ```typescript
   import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

   if (loading || !isAuthorized) {
   	return <TableSkeleton rows={10} columns={5} />;
   }
   ```

3. **Test and Commit:**
   - Run `npm run build`
   - Verify no breaking changes
   - Commit with message: `feat: migrate leaders page to React Query (Module 9d)`

---

## MODULE 9e: Ministries Page

**Goal:** Migrate ministries page to React Query

### Files to Modify:

- `src/app/dashboard/ministries/page.tsx` - Migrate to use React Query hooks

### Current State Analysis:

The ministries page likely uses:

- Direct DAL calls for ministry data
- Manual state management with useEffect/useState
- Legacy patterns for ministry management

### Implementation Steps:

1. **Create/Update Hooks:**

   - Use existing `useMinistries()` from `src/hooks/data/ministries.ts`
   - Add any missing ministry-specific hooks if needed

2. **Replace Legacy Patterns:**

   ```typescript
   // Replace useEffect + useState with
   const { data: ministries = [], isLoading, error } = useMinistries();
   ```

3. **Add Loading Skeleton:**

   ```typescript
   import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';

   if (isLoading) return <CardGridSkeleton cards={6} />;
   ```

4. **Test and Commit:**
   - Run `npm run build`
   - Verify ministry management functionality
   - Commit with message: `feat: migrate ministries page to React Query (Module 9e)`

---

## MODULE 9f: Main Dashboard Page

**Goal:** Migrate main dashboard page to React Query

### Files to Modify:

- `src/app/dashboard/page.tsx` - Migrate to use React Query hooks

### Current State Analysis:

The main dashboard likely displays:

- Summary statistics
- Recent activity
- Quick access cards
- Various data widgets

### Implementation Steps:

1. **Identify Data Sources:**

   - Dashboard statistics
   - Recent registrations
   - Attendance summaries
   - Ministry counts

2. **Create Dashboard Hooks:**

   ```typescript
   // Add to src/hooks/data/dashboard.ts
   export function useDashboardStats() {
   	return useQuery({
   		queryKey: queryKeys.dashboardStats(),
   		queryFn: getDashboardStats,
   		...cacheConfig.moderate,
   	});
   }
   ```

3. **Replace Legacy Patterns:**

   ```typescript
   const { data: stats, isLoading: statsLoading } = useDashboardStats();
   const { data: recentActivity } = useRecentActivity();
   ```

4. **Add Loading Skeleton:**

   ```typescript
   import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';

   if (statsLoading) return <CardGridSkeleton cards={4} />;
   ```

5. **Test and Commit:**
   - Run `npm run build`
   - Verify dashboard loads correctly
   - Commit with message: `feat: migrate main dashboard to React Query (Module 9f)`

---

## MODULE 9g: Users Management Page

**Goal:** Migrate users management page to React Query

### Files to Modify:

- `src/app/dashboard/users/page.tsx` - Migrate to use React Query hooks

### Current State Analysis:

The users page likely manages:

- User accounts
- Role assignments
- User permissions
- User search and filtering

### Implementation Steps:

1. **Create User Hooks:**

   ```typescript
   // Add to src/hooks/data/users.ts
   export function useUsers() {
   	return useQuery({
   		queryKey: queryKeys.users(),
   		queryFn: getAllUsers,
   		...cacheConfig.moderate,
   	});
   }

   export function useUserSearch(term: string) {
   	return useQuery({
   		queryKey: queryKeys.userSearch(term),
   		queryFn: () => searchUsers(term),
   		enabled: !!term.trim(),
   		...cacheConfig.volatile,
   	});
   }
   ```

2. **Replace Legacy Patterns:**

   ```typescript
   const { data: users = [], isLoading, error } = useUsers();
   const { data: searchResults = [] } = useUserSearch(searchTerm);
   ```

3. **Add Loading Skeleton:**

   ```typescript
   import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

   if (isLoading) return <TableSkeleton rows={8} columns={6} />;
   ```

4. **Test and Commit:**
   - Run `npm run build`
   - Verify user management functionality
   - Commit with message: `feat: migrate users management to React Query (Module 9g)`

---

## MODULE 9h: Check-In Page

**Goal:** Migrate check-in page to React Query

### Files to Modify:

- `src/app/dashboard/check-in/page.tsx` - Migrate to use React Query hooks

### Current State Analysis:

The check-in page likely uses:

- `CheckInView` component (already migrated)
- Event selection
- Grade filtering
- Status filtering

### Implementation Steps:

1. **Analyze Current Implementation:**

   - Check if `CheckInView` component is already using React Query
   - Identify any remaining legacy patterns in the page wrapper

2. **Replace Legacy Patterns:**

   ```typescript
   // Use existing hooks from CheckInView
   const { data: children = [] } = useChildren();
   const { data: attendance = [] } = useAttendance(today, selectedEvent);
   ```

3. **Add Loading Skeleton:**

   ```typescript
   import { RosterSkeleton } from '@/components/skeletons/RosterSkeleton';

   if (loading) return <RosterSkeleton />;
   ```

4. **Test and Commit:**
   - Run `npm run build`
   - Verify check-in/check-out functionality
   - Commit with message: `feat: migrate check-in page to React Query (Module 9h)`

---

## MODULE 9i: Branding Page

**Goal:** Migrate branding page to React Query

### Files to Modify:

- `src/app/dashboard/branding/page.tsx` - Migrate to use React Query hooks

### Current State Analysis:

The branding page likely manages:

- Organization branding settings
- Logo uploads
- Color schemes
- Branding configuration

### Implementation Steps:

1. **Create Branding Hooks:**

   ```typescript
   // Add to src/hooks/data/branding.ts
   export function useBrandingSettings() {
   	return useQuery({
   		queryKey: queryKeys.brandingSettings(),
   		queryFn: getBrandingSettings,
   		...cacheConfig.reference, // Branding rarely changes
   	});
   }
   ```

2. **Replace Legacy Patterns:**

   ```typescript
   const { data: brandingSettings, isLoading, error } = useBrandingSettings();
   ```

3. **Add Loading Skeleton:**

   ```typescript
   import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';

   if (isLoading) return <CardGridSkeleton cards={3} />;
   ```

4. **Test and Commit:**
   - Run `npm run build`
   - Verify branding management functionality
   - Commit with message: `feat: migrate branding page to React Query (Module 9i)`

---

## MODULE 10: Bible Bee Hooks

**Goal:** Create React Query hooks for Bible Bee functionality

### Files to Create:

- `src/hooks/data/bible-bee.ts` - Bible Bee-related React Query hooks

### Implementation Steps:

1. **Create Bible Bee Hooks:**

   ```typescript
   // src/hooks/data/bible-bee.ts
   'use client';

   import { useQuery } from '@tanstack/react-query';
   import {
   	getBibleBeeCycles,
   	getScriptures,
   	getStudentAssignments,
   	getBibleBeeStats,
   } from '@/lib/dal';
   import { queryKeys } from './keys';
   import { cacheConfig } from './config';

   export function useBibleBeeCycles() {
   	return useQuery({
   		queryKey: queryKeys.bibleBeeCycles(),
   		queryFn: getBibleBeeCycles,
   		...cacheConfig.reference,
   	});
   }

   export function useScriptures(cycleId: string) {
   	return useQuery({
   		queryKey: queryKeys.scriptures(cycleId),
   		queryFn: () => getScriptures(cycleId),
   		enabled: !!cycleId,
   		...cacheConfig.reference,
   	});
   }

   export function useStudentAssignments(childId: string) {
   	return useQuery({
   		queryKey: queryKeys.studentAssignments(childId),
   		queryFn: () => getStudentAssignments(childId),
   		enabled: !!childId,
   		...cacheConfig.moderate,
   	});
   }
   ```

2. **Update Query Keys:**

   ```typescript
   // Add to src/hooks/data/keys.ts
   bibleBeeCycles: () => ['bibleBeeCycles'] as const,
   scriptures: (cycleId: string) => ['scriptures', cycleId] as const,
   studentAssignments: (childId: string) => ['studentAssignments', childId] as const,
   ```

3. **Test and Commit:**
   - Run `npm run build`
   - Verify hooks work correctly
   - Commit with message: `feat: add Bible Bee React Query hooks (Module 10)`

---

## MODULE 11a: Bible Bee Main Page

**Goal:** Migrate Bible Bee main page to React Query

### Files to Modify:

- `src/app/dashboard/bible-bee/page.tsx` - Migrate to use React Query hooks

### Implementation Steps:

1. **Replace Legacy Patterns:**

   ```typescript
   const { data: cycles = [], isLoading } = useBibleBeeCycles();
   const { data: currentCycle } = useBibleBeeCycles();
   ```

2. **Add Loading Skeleton:**

   ```typescript
   import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';

   if (isLoading) return <CardGridSkeleton cards={4} />;
   ```

3. **Test and Commit:**
   - Run `npm run build`
   - Verify Bible Bee main page functionality
   - Commit with message: `feat: migrate Bible Bee main page to React Query (Module 11a)`

---

## MODULE 11b: Bible Bee Progress List Component

**Goal:** Migrate Bible Bee progress list component to React Query

### Files to Modify:

- `src/components/gatherKids/bible-bee-progress-list.tsx` - Migrate to use React Query hooks

### Implementation Steps:

1. **Replace Legacy Patterns:**

   ```typescript
   const { data: assignments = [], isLoading } = useStudentAssignments(childId);
   ```

2. **Add Loading Skeleton:**

   ```typescript
   import { BibleBeeProgressSkeleton } from '@/components/skeletons/BibleBeeProgressSkeleton';

   if (isLoading) return <BibleBeeProgressSkeleton />;
   ```

3. **Test and Commit:**
   - Run `npm run build`
   - Verify progress list functionality
   - Commit with message: `feat: migrate Bible Bee progress list to React Query (Module 11b)`

---

## MODULE 11c: Bible Bee Detail Component

**Goal:** Migrate Bible Bee detail component to React Query

### Files to Modify:

- `src/app/dashboard/bible-bee/year/[id]/page.tsx` - Migrate to use React Query hooks

### Implementation Steps:

1. **Replace Legacy Patterns:**

   ```typescript
   const { data: scriptures = [], isLoading } = useScriptures(cycleId);
   const { data: assignments = [] } = useStudentAssignments(childId);
   ```

2. **Add Loading Skeleton:**

   ```typescript
   import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

   if (isLoading) return <TableSkeleton rows={10} columns={4} />;
   ```

3. **Test and Commit:**
   - Run `npm run build`
   - Verify Bible Bee detail functionality
   - Commit with message: `feat: migrate Bible Bee detail component to React Query (Module 11c)`

---

## MODULE 12: Barrel Exports

**Goal:** Create comprehensive barrel exports for all React Query hooks

### Files to Create/Modify:

- `src/hooks/data/index.ts` - Update with all hooks
- `src/hooks/index.ts` - Create root barrel export

### Implementation Steps:

1. **Update Data Hooks Barrel Export:**

   ```typescript
   // src/hooks/data/index.ts
   export * from './children';
   export * from './households';
   export * from './attendance';
   export * from './ministries';
   export * from './registration';
   export * from './leaders';
   export * from './bible-bee';
   export * from './users';
   export * from './branding';
   export * from './dashboard';
   export { queryKeys } from './keys';
   export { cacheConfig } from './config';
   ```

2. **Create Root Barrel Export:**

   ```typescript
   // src/hooks/index.ts
   export * from './data';
   export * from './ui';
   ```

3. **Test and Commit:**
   - Run `npm run build`
   - Verify all imports work
   - Commit with message: `feat: add comprehensive barrel exports (Module 12)`

---

## MODULE 13: Update Imports

**Goal:** Update all remaining imports to use new barrel exports

### Implementation Steps:

1. **Find Legacy Imports:**

   ```bash
   grep -r "@/lib/hooks/useData" src/
   grep -r "@/hooks/data/" src/
   ```

2. **Replace with Barrel Imports:**

   ```typescript
   // Replace
   import { useChildren } from '@/hooks/data/children';
   import { useHouseholds } from '@/hooks/data/households';

   // With
   import { useChildren, useHouseholds } from '@/hooks';
   ```

3. **Test and Commit:**
   - Run `npm run build`
   - Verify all imports work correctly
   - Commit with message: `feat: update all imports to use barrel exports (Module 13)`

---

## MODULE 14: Documentation

**Goal:** Create comprehensive documentation for React Query usage

### Files to Create:

- `docs/react-query-conventions.md` - React Query usage conventions
- `docs/react-query-examples.md` - Code examples and patterns

### Implementation Steps:

1. **Create Conventions Document:**

   ```markdown
   # React Query Conventions

   ## Cache Key Patterns

   - Use hierarchical keys for efficient invalidation
   - Include relevant parameters in key structure

   ## Cache Configuration

   - reference: 10min stale time (rarely changes)
   - moderate: 5min stale time (changes occasionally)
   - volatile: 1min stale time (changes frequently)

   ## Loading States

   - Use skeleton components instead of "Loading..." text
   - Match skeleton dimensions to actual content
   ```

2. **Create Examples Document:**

   ````markdown
   # React Query Examples

   ## Basic Query Hook

   ```typescript
   export function useChildren() {
   	return useQuery({
   		queryKey: queryKeys.children(),
   		queryFn: getAllChildren,
   		...cacheConfig.moderate,
   	});
   }
   ```
   ````

   ```

   ```

3. **Test and Commit:**
   - Run `npm run build`
   - Verify documentation is complete
   - Commit with message: `docs: add comprehensive React Query documentation (Module 14)`

---

## FINAL: Final Validation

**Goal:** Comprehensive validation of the entire React Query migration

### Implementation Steps:

1. **Run Full Test Suite:**

   ```bash
   npm test
   npm run build
   npm run lint
   ```

2. **Verify All Pages:**

   - Test each migrated page manually
   - Verify loading states work correctly
   - Check error handling
   - Confirm data fetching works

3. **Performance Check:**

   - Verify cache invalidation works correctly
   - Check for memory leaks
   - Confirm proper cleanup

4. **Documentation Review:**

   - Ensure all patterns are documented
   - Verify examples are accurate
   - Check migration plan is complete

5. **Final Commit:**

   ```bash
   git add .
   git commit -m "feat: complete React Query migration

   - All pages migrated to React Query
   - Comprehensive documentation added
   - All tests passing
   - Performance optimized
   - Ready for production"
   ```

---

## Remaining Modules Summary

The following modules follow the detailed implementation patterns above:

1. **MODULE 9d:** Leaders Page - Update imports, add TableSkeleton
2. **MODULE 9e:** Ministries Page - Use existing hooks, add CardGridSkeleton
3. **MODULE 9f:** Main Dashboard - Create dashboard hooks, add CardGridSkeleton
4. **MODULE 9g:** Users Management - Create user hooks, add TableSkeleton
5. **MODULE 9h:** Check-In Page - Verify CheckInView, add RosterSkeleton
6. **MODULE 9i:** Branding Page - Create branding hooks, add CardGridSkeleton
7. **MODULE 10:** Bible Bee Hooks - Create comprehensive Bible Bee hooks
8. **MODULE 11a:** Bible Bee Main Page - Migrate main page, add CardGridSkeleton
9. **MODULE 11b:** Bible Bee Progress List - Migrate component, add BibleBeeProgressSkeleton
10. **MODULE 11c:** Bible Bee Detail - Migrate detail page, add TableSkeleton
11. **MODULE 12:** Barrel Exports - Create comprehensive exports
12. **MODULE 13:** Update Imports - Replace all legacy imports
13. **MODULE 14:** Documentation - Create comprehensive docs
14. **FINAL:** Final Validation - Complete testing and validation

Each module includes specific implementation steps, file modifications, and commit messages to eliminate any ambiguity.

## Module Implementation Template

For each remaining module, follow this template:

### Analysis Phase

1. Read the page file (e.g., `src/app/dashboard/[page]/page.tsx`)
2. Identify all data fetching patterns:
   - useEffect + useState
   - Direct DAL calls
   - Legacy hook imports from `@/lib/hooks/useData`
3. List required data sources
4. Determine appropriate loading skeleton

### Implementation Phase

1. **Create/Update Hook File**

   - Add hooks to appropriate `src/hooks/data/*.ts` file
   - Use proper cacheConfig (reference/moderate/volatile)
   - Add query keys to `src/hooks/data/keys.ts` if needed

2. **Migrate Page**

   - Replace imports to use `@/hooks/data/*`
   - Replace useEffect + useState with React Query hooks
   - Add error handling for query errors
   - Combine loading states if multiple queries
   - Replace "Loading..." with appropriate skeleton component

3. **Test**

   - Run `npm run build`
   - Check for linting errors
   - Verify no breaking changes
   - Check loading skeleton appearance

4. **Commit**
   - Use descriptive commit message
   - Update this plan's Module Status
   - Include "Module X:" prefix in commit message

### Example Commit Message

```
feat: migrate [page] page to React Query (Module 9x)

- Add use[Feature] hook for [description]
- Replace useEffect/useState pattern with React Query hooks
- Add [SkeletonType] loading skeleton for better UX
- Improve error handling with React Query's built-in error states
- Maintain all existing functionality
- Update migration plan to mark Module 9x as complete
- Build verification: ✅ All tests pass, no linting errors

This completes the [page] page migration to React Query.
```
