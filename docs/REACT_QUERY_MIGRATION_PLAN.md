<!-- Migration Plan Tracking Document -->

# React Query Migration Plan - Modular Approach

## Progress Tracking

**IMPORTANT:** As each module is completed, check off the items in this plan file by replacing `- [ ]` with `- [x]`. This plan file will be saved to `/docs/REACT_QUERY_MIGRATION_PLAN.md` and updated throughout execution to track progress.

## Migration Strategy

Each module is a self-contained unit of work that:

1. Creates new code alongside existing code (zero breaking changes)
2. Includes its own test verification step
3. Must pass ALL existing tests before commit
4. Gets committed independently before next module begins

This ensures the codebase remains stable and working throughout the entire migration.

## Module Status

- [x] MODULE 1: Foundation Infrastructure
- [x] MODULE 2: Skeleton Components
- [x] MODULE 3: Children Data Hooks
- [x] MODULE 4: Households & Guardians Hooks
- [x] MODULE 5: Attendance & Incidents Hooks
- [x] MODULE 6: Migrate Roster Page (FIRST REAL MIGRATION)
- [ ] MODULE 7: Ministry Hooks
- [ ] MODULE 8: Registration Hooks
- [ ] MODULE 9a: Incidents Page
- [ ] MODULE 9b: Registrations Page
- [ ] MODULE 9c: Reports Page
- [ ] MODULE 9d: Leaders Page
- [ ] MODULE 9e: Ministries Page
- [ ] MODULE 9f: Main Dashboard Page
- [ ] MODULE 9g: Users Management Page
- [ ] MODULE 9h: Check-In Page
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

[Rest of plan continues as per the full document...]
