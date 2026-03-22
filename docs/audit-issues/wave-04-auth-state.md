## Context

Part of the [Comprehensive Application Audit](../COMPREHENSIVE-AUDIT-REPORT.md) sequencing. **Wave 4** stabilizes auth and state after demo mode removal (Wave 3). These changes touch `auth-context.tsx` and data hooks; do them while the context is still fresh from #191.

**Prerequisite**: Wave 3 (demo mode removal) complete.

## Checklist

- [ ] **MAINT-09**: Consolidate ministry access logic — In `auth-context.tsx`, use `checkAndUpdateMinistryAccess` (or equivalent) in all 4 remaining code paths that fetch accessible ministries and assign ministry IDs; remove duplicated ~30-line blocks.
- [ ] **PERF-10**: Convert `isAuthorized` to derived const — In all 10 dashboard pages, replace `useState(false)` + `useEffect` that sets `isAuthorized` from `user`/`loading` with a single derived value: `const isAuthorized = !loading && !!user && user.metadata?.role === AuthRole.ADMIN` (or the correct role for that page). Remove the effect and state.
- [ ] **MAINT-10**: Standardize React Query key patterns — In `src/hooks/data/attendance.ts`, `children.ts`, and any other hooks using raw key arrays, use the `queryKeys` factory from `src/hooks/data/keys.ts` for all invalidation and query keys. Ensure useCheckInMutation and useCheckOutMutation use the same pattern (e.g. `queryKeys.attendance(today)`).
- [ ] **MAINT-11**: Fix user object as React Query key — In `useIncidentsForUser` (or equivalent), change `queryKey: ['incidents', 'user', user]` to use a stable primitive, e.g. `queryKey: ['incidents', 'user', user?.uid]`. Add `incidentsForUser(userId)` to queryKeys factory if missing.

## Acceptance criteria

- Single implementation of ministry access logic in auth context; no duplicated 30-line blocks.
- No dashboard page uses useState + useEffect solely to derive `isAuthorized` from auth state.
- All React Query keys used in hooks come from the queryKeys factory (or are documented exceptions).
- No query key uses the full `user` object; use `user?.uid` or equivalent.

## How to test

1. **Unit**: `npm test` — auth and hook tests pass.
2. **Lint**: `npx next lint` — pass.
3. **Manual**: Log in as admin and ministry leader; confirm dashboard, check-in, rosters, and role-restricted pages behave correctly. Log in as guardian; confirm redirect and household view.
4. **Manual**: Trigger check-in and check-out; confirm cache invalidation updates UI (no stale counts or lists).
5. **Manual**: As admin, open incidents or any feature keyed by user; confirm data loads and refetches when appropriate.
