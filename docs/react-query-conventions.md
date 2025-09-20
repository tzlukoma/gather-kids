# React Query Conventions

This document outlines the conventions and patterns used for React Query in the gatherKids application.

## Overview

All client-side data fetching is standardized on React Query (@tanstack/react-query) to provide:
- Consistent caching and invalidation
- Background refetching
- Loading and error states
- Optimistic updates
- Minimal network requests

## Hook Organization

Hooks are organized under `src/hooks/` by domain:

```
src/hooks/
├── data/                    # Data fetching hooks
│   ├── children.ts         # Child-related queries
│   ├── households.ts       # Household, guardian queries  
│   ├── attendance.ts       # Attendance and incident queries
│   ├── misc.ts            # Emergency contacts, ministries
│   ├── mutations.ts        # All mutation hooks
│   ├── useBibleBee.ts     # Bible Bee specific queries
│   └── keys.ts            # Central query key definitions
├── ui/                     # UI-related hooks
│   ├── use-toast.ts
│   ├── use-mobile.tsx
│   └── ...
├── auth/                   # Authentication hooks (future)
└── index.ts               # Barrel export
```

## Query Key Patterns

### Cache Key Structure

Query keys follow a hierarchical structure for efficient invalidation:

```typescript
// Domain-based keys
['children']                                    // All children
['child', childId]                             // Specific child
['households']                                 // All households  
['household', householdId]                     // Specific household
['attendance', date]                           // Date-scoped attendance
['attendance', date, eventId]                  // Event-scoped attendance
['incidents', date]                            // Date-scoped incidents
['ministries']                                 // All ministries
['ministries', 'active']                       // Active ministries only
['ministryEnrollments', cycleId]               // Enrollments by cycle
```

### Event-Scoped Keys

For attendance queries, support optional `eventId` for granular invalidation:

```typescript
// General attendance for a date
const attendanceKey = ['attendance', '2024-01-15'];

// Event-specific attendance
const eventAttendanceKey = ['attendance', '2024-01-15', 'evt_sunday_school'];
```

## Stale Time Guidelines

Set appropriate `staleTime` based on data volatility:

```typescript
// Reference data (changes infrequently)
staleTime: 10 * 60 * 1000,  // 10 minutes - households, guardians, ministries

// Child data (moderate changes)  
staleTime: 5 * 60 * 1000,   // 5 minutes - children, household profiles

// Volatile data (frequent changes)
staleTime: 1 * 60 * 1000,   // 1 minute - attendance, incidents
```

## Mutation Patterns

### Cache Invalidation Strategy

Mutations use **minimal invalidation** - only refresh the most specific caches affected:

```typescript
// ✅ Good: Event-scoped invalidation first, then fallback
onSuccess: (_, { eventId }) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Most specific first
  if (eventId) {
    queryClient.invalidateQueries({ 
      queryKey: ['attendance', today, eventId] 
    });
  }
  
  // Broader fallback
  queryClient.invalidateQueries({ 
    queryKey: ['attendance', today] 
  });
}

// ❌ Avoid: Over-broad invalidation
queryClient.invalidateQueries(); // Invalidates everything!
```

### Standard Mutations

```typescript
// Check-in mutation
const checkInMutation = useCheckInMutation();
await checkInMutation.mutateAsync({
  childId,
  eventId,
  notes,
  userId
});

// Check-out mutation  
const checkOutMutation = useCheckOutMutation();
await checkOutMutation.mutateAsync({
  attendanceId,
  verifier: { method: 'PIN', value: '1234' },
  userId
});
```

## Background Refetching

### Window Focus Refetching

Let React Query handle background updates automatically:

```typescript
// ✅ Good: Let React Query manage refetching
const { data: attendance } = useAttendance(date);

// ❌ Avoid: Manual refetching in effects
useEffect(() => {
  const interval = setInterval(fetchAttendance, 30000);
  return () => clearInterval(interval);
}, []);
```

### Selective Refetch Intervals

Use `refetchInterval` sparingly for live data:

```typescript
// For truly live data (e.g., active check-ins)
const { data } = useIncidents(today, {
  refetchInterval: 30 * 1000, // 30 seconds
});
```

## Error Handling

Queries automatically handle errors via React Query's built-in error boundaries and retry logic. Components can access error state:

```typescript
const { data, error, isError, isLoading } = useChildren();

if (isError) {
  return <ErrorMessage error={error} />;
}
```

## Migration from Direct DAL Calls  

### Before (Problematic)
```typescript
// ❌ Manual data fetching
const [incidents, setIncidents] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadIncidents = async () => {
    try {
      setLoading(true);
      const data = await getIncidentsForDate(today);
      setIncidents(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  loadIncidents();
}, [today]);
```

### After (React Query)
```typescript  
// ✅ Declarative data fetching
const { data: incidents = [], isLoading } = useIncidents(today);
```

## Import Patterns

Use the barrel import for clean imports:

```typescript
// ✅ Preferred
import { 
  useChildren, 
  useAttendance, 
  useCheckInMutation 
} from '@/hooks';

// ❌ Avoid direct file imports
import { useChildren } from '@/hooks/data/children';
```

## Testing

Mock React Query for tests using the existing `__mocks__/@tanstack/react-query.ts` setup.

## Best Practices

1. **No direct DAL calls in components** - Always wrap in React Query hooks
2. **Consistent key patterns** - Follow the established hierarchy  
3. **Minimal invalidation** - Only refresh what's actually affected
4. **Appropriate stale times** - Match data volatility
5. **Leverage React Query features** - Use built-in loading states, error handling, background refetching
6. **Avoid over-fetching** - Use `enabled` option to conditionally fetch
7. **Cache efficiency** - Structure keys for efficient partial invalidation

## Future Enhancements

- **Optimistic updates** for mutations with immediate UI feedback
- **Infinite queries** for large datasets with pagination  
- **Suspense support** when React 18 Concurrent Features are fully adopted
- **Offline support** with React Query's offline capabilities