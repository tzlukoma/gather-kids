# React Query Standards for gatherKids

This document defines the comprehensive standards and conventions for using React Query (TanStack Query) in the gatherKids project. All developers and AI agents must follow these standards to ensure consistency, maintainability, and optimal performance.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Organization](#file-organization)
3. [Query Key Conventions](#query-key-conventions)
4. [Cache Configuration](#cache-configuration)
5. [Hook Patterns](#hook-patterns)
6. [Loading States](#loading-states)
7. [Error Handling](#error-handling)
8. [Mutation Patterns](#mutation-patterns)
9. [Import Conventions](#import-conventions)
10. [Testing Standards](#testing-standards)
11. [Performance Guidelines](#performance-guidelines)
12. [Migration Patterns](#migration-patterns)

## Architecture Overview

React Query serves as the **single source of truth** for all client-side data operations in gatherKids, including both **data fetching** and **data mutations**. This eliminates:

- Manual state management with `useState` and `useEffect`
- Direct DAL calls bypassing React Query cache
- Inconsistent loading and error states
- Scattered cache invalidation logic
- Manual mutation state management
- Inconsistent error handling for mutations

### Core Principles

1. **All data fetching goes through React Query hooks**
2. **All data mutations go through React Query mutations**
3. **Centralized query key management**
4. **Consistent cache configuration**
5. **Professional loading states with skeletons**
6. **Smart cache invalidation strategies**
7. **Unified error handling for queries and mutations**

## File Organization

### Hook Architecture

All React Query hooks are organized under `src/hooks/data/` with domain-based structure:

```
src/hooks/data/
├── keys.ts             # Central query key factory
├── config.ts           # Cache configuration (staleTime, gcTime)
├── children.ts         # Child-related queries
├── households.ts       # Household, guardian, emergency contact queries
├── attendance.ts       # Attendance and incident queries
├── ministries.ts       # Ministry and enrollment queries
├── registration.ts     # Registration cycle queries
├── leaders.ts          # Leader profile queries
├── users.ts            # User management queries
├── branding.ts         # Branding settings queries
├── bibleBee.ts         # Bible Bee functionality queries
├── dashboard.ts        # Dashboard-specific queries
└── index.ts            # Barrel export
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

## Query Key Conventions

### Hierarchical Structure

Query keys follow a hierarchical structure for efficient invalidation:

```typescript
// Collection-scoped (broad invalidation)
queryKeys.children(); // ['children']
queryKeys.households(); // ['households']
queryKeys.ministries(); // ['ministries']

// Entity-scoped (specific invalidation)
queryKeys.child(id); // ['child', 'child-123']
queryKeys.household(id); // ['household', 'household-456']

// Event-scoped (granular invalidation)
queryKeys.attendance(date, eventId); // ['attendance', '2024-01-15', 'evt_sunday_school']
queryKeys.incidents(date, eventId); // ['incidents', '2024-01-15', 'evt_sunday_school']

// Parameter-scoped (conditional invalidation)
queryKeys.leaderSearch(term); // ['leaderSearch', 'john']
queryKeys.ministriesByGroupCode(code); // ['ministriesByGroupCode', 'elementary']
```

### Key Factory Pattern

All query keys are defined in `src/hooks/data/keys.ts` using a factory pattern:

```typescript
export const queryKeys = {
	// Collection keys
	children: () => ['children'] as const,
	households: () => ['households'] as const,
	ministries: () => ['ministries'] as const,

	// Entity keys
	child: (id: string) => ['child', id] as const,
	household: (id: string) => ['household', id] as const,

	// Event-scoped keys
	attendance: (date: string, eventId?: string) =>
		eventId ? ['attendance', date, eventId] : ['attendance', date],
	incidents: (date: string, eventId?: string) =>
		eventId ? ['incidents', date, eventId] : ['incidents', date],

	// Parameter-scoped keys
	leaderSearch: (term: string) => ['leaderSearch', term] as const,
	ministriesByGroupCode: (groupCode: string) =>
		['ministriesByGroupCode', groupCode] as const,
};
```

### Key Naming Conventions

- Use **camelCase** for key names
- Use **singular** for entity keys: `child`, `household`, `ministry`
- Use **plural** for collection keys: `children`, `households`, `ministries`
- Include **parameters** in key names when relevant: `attendance`, `incidents`
- Use **descriptive suffixes** for specialized queries: `Search`, `ByGroupCode`

## Cache Configuration

### Configuration Levels

Cache configuration is centralized in `src/hooks/data/config.ts`:

```typescript
export const cacheConfig = {
	reference: {
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 20 * 60 * 1000, // 20 minutes
	},
	moderate: {
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	},
	volatile: {
		staleTime: 1 * 60 * 1000, // 1 minute
		gcTime: 5 * 60 * 1000, // 5 minutes
	},
};
```

### Usage Guidelines

- **reference**: Data that rarely changes (ministries, registration cycles, Bible Bee cycles)
- **moderate**: Data that changes occasionally (children, households, leaders)
- **volatile**: Data that changes frequently (attendance, incidents, check-in status)

### Example Usage

```typescript
export function useMinistries() {
	return useQuery({
		queryKey: queryKeys.ministries(),
		queryFn: getMinistries,
		...cacheConfig.reference, // Ministries rarely change
	});
}

export function useChildren() {
	return useQuery({
		queryKey: queryKeys.children(),
		queryFn: getAllChildren,
		...cacheConfig.moderate, // Children change occasionally
	});
}

export function useAttendance(date: string, eventId?: string) {
	return useQuery({
		queryKey: queryKeys.attendance(date, eventId),
		queryFn: () => getAttendanceForDate(date, eventId),
		enabled: !!date,
		...cacheConfig.volatile, // Attendance changes frequently
	});
}
```

## Hook Patterns

### Basic Query Hook

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

### Conditional Query Hook

```typescript
export function useChild(childId: string) {
	return useQuery({
		queryKey: queryKeys.child(childId),
		queryFn: () => getChild(childId),
		enabled: !!childId, // Only run query if childId exists
		...cacheConfig.moderate,
	});
}
```

### Parameterized Query Hook

```typescript
export function useMinistriesByGroupCode(groupCode: string) {
	return useQuery({
		queryKey: queryKeys.ministriesByGroupCode(groupCode),
		queryFn: () => getMinistriesByGroupCode(groupCode),
		enabled: !!groupCode,
		...cacheConfig.reference,
	});
}
```

### Event-Scoped Query Hook

```typescript
export function useAttendance(date: string, eventId?: string) {
	return useQuery({
		queryKey: queryKeys.attendance(date, eventId),
		queryFn: () => getAttendanceForDate(date, eventId),
		enabled: !!date,
		...cacheConfig.volatile,
	});
}
```

## Loading States

### Skeleton Components

**NEVER use simple "Loading..." text.** Always use appropriate skeleton components:

```typescript
// ❌ BAD - Simple loading text
if (loading) return <div>Loading...</div>;

// ✅ GOOD - Professional skeleton components
if (loading) return <TableSkeleton rows={8} columns={5} />;
```

### Skeleton Usage Patterns

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

### Multiple Loading States

When combining multiple queries, use logical OR for loading states:

```typescript
const { data: children = [], isLoading: childrenLoading } = useChildren();
const { data: households = [], isLoading: householdsLoading } = useHouseholds();

const loading = childrenLoading || householdsLoading;

if (loading) return <TableSkeleton rows={8} columns={5} />;
```

## Error Handling

### Query Error Handling

```typescript
const { data: children = [], isLoading, error } = useChildren();

if (error) {
	console.error('Error loading children:', error);
	return <div>Error loading children. Please try again.</div>;
}
```

### Mutation Error Handling

```typescript
const acknowledgeIncidentMutation = useAcknowledgeIncident();

const handleAcknowledge = async (incidentId: string) => {
	try {
		await acknowledgeIncidentMutation.mutateAsync(incidentId);
		toast.success('Incident acknowledged successfully');
	} catch (error) {
		console.error('Error acknowledging incident:', error);
		toast.error('Failed to acknowledge incident. Please try again.');
	}
};
```

## Mutation Patterns

### Basic Mutation Hook

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

### Complex Mutation with Multiple Invalidations

```typescript
export function useCheckInMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			childId,
			eventId,
			timeslotId,
			userId,
		}: {
			childId: string;
			eventId: string;
			timeslotId?: string;
			userId?: string;
		}) => recordCheckIn(childId, eventId, timeslotId, userId),
		onSuccess: (_, { eventId }) => {
			const today = getTodayIsoDate();
			// Invalidate attendance queries
			queryClient.invalidateQueries({ queryKey: queryKeys.attendance(today) });
			queryClient.invalidateQueries({
				queryKey: queryKeys.attendance(today, eventId),
			});
			// Invalidate checked-in children
			queryClient.invalidateQueries({
				queryKey: queryKeys.checkedInChildren(today),
			});
			// Invalidate checked-in count
			queryClient.invalidateQueries({
				queryKey: queryKeys.checkedInCount(today),
			});
			// Invalidate children list
			queryClient.invalidateQueries({ queryKey: queryKeys.children() });
		},
	});
}
```

### Mutation with Optimistic Updates

```typescript
export function useUpdateChild() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateChild,
		onMutate: async (newChild) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: queryKeys.child(newChild.id),
			});

			// Snapshot previous value
			const previousChild = queryClient.getQueryData(
				queryKeys.child(newChild.id)
			);

			// Optimistically update
			queryClient.setQueryData(queryKeys.child(newChild.id), newChild);

			return { previousChild };
		},
		onError: (err, newChild, context) => {
			// Rollback on error
			queryClient.setQueryData(
				queryKeys.child(newChild.id),
				context?.previousChild
			);
		},
		onSettled: (data, error, variables) => {
			// Always refetch after error or success
			queryClient.invalidateQueries({
				queryKey: queryKeys.child(variables.id),
			});
		},
	});
}
```

## Import Conventions

### Barrel Exports

Use barrel exports for clean imports:

```typescript
// ✅ GOOD - Use barrel exports
import { useChildren, useHouseholds, useToast } from '@/hooks';

// ❌ BAD - Direct file imports
import { useChildren } from '@/hooks/data/children';
import { useHouseholds } from '@/hooks/data/households';
import { useToast } from '@/hooks/ui/use-toast';
```

### Barrel Export Structure

```typescript
// src/hooks/data/index.ts
export * from './children';
export * from './households';
export * from './attendance';
export * from './ministries';
export * from './registration';
export * from './leaders';
export * from './users';
export * from './branding';
export * from './bibleBee';
export * from './dashboard';
export { queryKeys } from './keys';
export { cacheConfig } from './config';

// src/hooks/index.ts
export * from './data';
export * from './ui';
```

## Testing Standards

### Mock React Query

Use the provided React Query mock in tests:

```typescript
// __mocks__/@tanstack/react-query.ts
import { vi } from 'vitest';

export const useQuery = vi.fn(() => ({
	data: undefined,
	isLoading: false,
	error: null,
	refetch: vi.fn(),
}));

export const useMutation = vi.fn(() => ({
	mutate: vi.fn(),
	mutateAsync: vi.fn(),
	isLoading: false,
	error: null,
}));

export const useQueryClient = vi.fn(() => ({
	invalidateQueries: vi.fn(),
	setQueryData: vi.fn(),
	getQueryData: vi.fn(),
}));
```

### Test Hook Behavior

```typescript
import { renderHook } from '@testing-library/react';
import { useChildren } from '@/hooks/data/children';

describe('useChildren', () => {
	it('should return children data', () => {
		const { result } = renderHook(() => useChildren());

		expect(result.current.data).toBeDefined();
		expect(result.current.isLoading).toBe(false);
	});
});
```

## Performance Guidelines

### Query Optimization

1. **Use appropriate cache configurations** based on data volatility
2. **Enable queries conditionally** with the `enabled` option
3. **Use staleTime** to prevent unnecessary refetches
4. **Implement proper invalidation** strategies

### Memory Management

1. **Set appropriate gcTime** to prevent memory leaks
2. **Use query key hierarchies** for efficient invalidation
3. **Avoid over-fetching** with proper query parameters

### Network Optimization

1. **Batch related queries** when possible
2. **Use background refetching** for better UX
3. **Implement retry logic** for failed queries

## Migration Patterns

### From useEffect + useState

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

### From Direct DAL Calls

**Before:**

```typescript
const handleSubmit = async (data) => {
	try {
		await createChild(data);
		// Manual state updates
		setChildren((prev) => [...prev, newChild]);
	} catch (error) {
		// Manual error handling
	}
};
```

**After:**

```typescript
const createChildMutation = useCreateChild();

const handleSubmit = async (data) => {
	try {
		await createChildMutation.mutateAsync(data);
		toast.success('Child created successfully');
	} catch (error) {
		toast.error('Failed to create child');
	}
};
```

### From Manual Mutation State Management

**Before:**

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
const [submitError, setSubmitError] = useState(null);

const handleSubmit = async (data) => {
	setIsSubmitting(true);
	setSubmitError(null);
	try {
		await updateChild(data);
		// Manual success handling
	} catch (error) {
		setSubmitError(error.message);
	} finally {
		setIsSubmitting(false);
	}
};
```

**After:**

```typescript
const updateChildMutation = useUpdateChild();

const handleSubmit = async (data) => {
	try {
		await updateChildMutation.mutateAsync(data);
		toast.success('Child updated successfully');
	} catch (error) {
		toast.error('Failed to update child');
	}
};

// Access loading and error states directly from mutation
const { isLoading: isSubmitting, error: submitError } = updateChildMutation;
```

## Best Practices Summary

### ✅ DO

- Use React Query for ALL data fetching AND mutations
- Follow the established file organization
- Use appropriate skeleton components for loading states
- Implement proper error handling for both queries and mutations
- Use barrel exports for clean imports
- Follow query key naming conventions
- Use appropriate cache configurations
- Implement smart cache invalidation
- Use React Query mutations instead of manual async/await patterns
- Handle mutation loading states consistently

### ❌ DON'T

- Use `useState` + `useEffect` for data fetching
- Use manual async/await patterns for mutations
- Make direct DAL calls from components
- Use simple "Loading..." text
- Ignore error states in queries or mutations
- Create inconsistent query keys
- Use inappropriate cache configurations
- Forget to invalidate related queries after mutations
- Mix React Query patterns with manual state management

## Reference Examples

### Exemplar Components

The following components serve as perfect examples of React Query usage:

- **Check-In View** (`src/app/dashboard/check-in/page.tsx`)
- **Rosters Page** (`src/app/dashboard/rosters/page.tsx`)
- **Dashboard Page** (`src/app/dashboard/page.tsx`)

These components demonstrate:

- Proper hook usage patterns
- Loading skeleton implementation
- Error handling strategies
- Cache invalidation logic
- Multiple query coordination

## Conclusion

These React Query standards ensure consistency, maintainability, and optimal performance across the gatherKids application. All developers and AI agents must follow these conventions to maintain code quality and user experience standards.

For questions or clarifications about these standards, refer to the exemplar components or consult the development team.
