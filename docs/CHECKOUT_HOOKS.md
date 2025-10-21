# Implement Check-In/Check-Out Mutation Hooks

## Overview

Migrate existing check-in/check-out mutation hooks from `src/lib/hooks/useData.ts` to the new React Query data layer at `src/hooks/data/`. The hooks already exist but need to be moved and updated to use the new query key structure.

## Implementation Steps

### 1. Create `src/hooks/data/attendance.ts` mutations (ADD)

Move and update the existing mutation hooks from `src/lib/hooks/useData.ts` (lines 256-296):

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recordCheckIn, recordCheckOut, getTodayIsoDate } from '@/lib/dal';
import { queryKeys } from './keys';

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

export function useCheckOutMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			attendanceId,
			verifier,
			userId,
		}: {
			attendanceId: string;
			verifier: { method: 'PIN' | 'other'; value: string; pickedUpBy?: string };
			userId?: string;
		}) => recordCheckOut(attendanceId, verifier, userId),
		onSuccess: () => {
			const today = getTodayIsoDate();
			// Invalidate attendance queries
			queryClient.invalidateQueries({ queryKey: queryKeys.attendance(today) });
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

**Note**: The signature for `recordCheckIn` uses `timeslotId` (not `notes` as in legacy code).

### 2. Update `src/hooks/data/index.ts` (MODIFY)

Add exports for the new mutation hooks:

```typescript
export {
	useAttendance,
	useIncidents,
	useIncidentsForUser,
	useAcknowledgeIncident,
	useCheckInMutation,
	useCheckOutMutation,
} from './attendance';
```

### 3. Update `src/components/gatherKids/check-in-view.tsx` (MODIFY)

Replace placeholder mutations (lines 96-97) with real hooks:

```typescript
// Replace:
const checkInMutation = { mutate: () => {}, isPending: false }; // TODO: useCheckInMutation();
const checkOutMutation = { mutate: () => {}, isPending: false }; // TODO: useCheckOutMutation();

// With:
const checkInMutation = useCheckInMutation();
const checkOutMutation = useCheckOutMutation();
```

Remove TODO comments from imports (lines 33-37):

```typescript
// Remove TODO comments, just import normally
import {
	useGuardians,
	useHouseholds,
	useEmergencyContacts,
	useCheckInMutation,
	useCheckOutMutation,
} from '@/hooks/data';
```

### 4. Commit with issue closure

Commit message should include `Closes #170` to auto-close the GitHub issue.

## Key Differences from Legacy

1. **Query keys**: Use centralized `queryKeys` from `./keys` instead of hardcoded arrays
2. **Date helper**: Use `getTodayIsoDate()` instead of manual date formatting
3. **Granular invalidation**: Invalidate both general and event-specific attendance queries
4. **Additional invalidations**: Include `checkedInChildren` and `checkedInCount` queries

## Files Modified

- `src/hooks/data/attendance.ts` - Add mutation hooks
- `src/hooks/data/index.ts` - Add exports
- `src/components/gatherKids/check-in-view.tsx` - Replace placeholders

## Acceptance Criteria

- Mutation hooks use proper query key structure
- All relevant caches invalidated on success
- Component uses real hooks instead of placeholders
- Check-in/check-out functionality works correctly
- No linting errors
