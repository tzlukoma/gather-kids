## Context

Part of the [Comprehensive Application Audit](../COMPREHENSIVE-AUDIT-REPORT.md) sequencing. **Wave 5** cleans up the data layer after demo mode removal. Splitting the DAL and centralizing types reduces merge conflicts with later waves.

**Prerequisite**: Wave 3 (demo mode removal) complete.

## Checklist

- [ ] **MAINT-04**: Split `dal.ts` — Extract Supabase-only implementations into `src/lib/dal/supabase/` (or similar): one file per domain (e.g. `attendance.ts`, `children.ts`, `ministries.ts`, `registration.ts`, `incidents.ts`). Keep `dal.ts` as a thin re-export facade or single adapter that composes these modules. No change to public API surface; callers still use `getDal()`.
- [ ] **MAINT-05**: Centralize types — Move shared types (e.g. `Child`, `AttendanceRecord`, `Ministry`, `RegistrationCycle`) from `dal.ts` or scattered modules into `src/types/` (or `src/lib/dal/types.ts`). Import from central location in DAL and in components/hooks. Resolve any circular dependency by extracting interfaces only if needed.
- [ ] **MAINT-06**: Remove dead code — After split, run coverage or manual audit; remove unused exports and any leftover demo-only branches in DAL or hooks that depend on it.
- [ ] **MAINT-07**: Document DAL contracts — Add a short README or JSDoc in `src/lib/dal/` describing the adapter interface (e.g. `getChildren(ministryId, cycleId)`), list of modules, and that the app uses Supabase only. Optionally add contract tests (e.g. expect(getDal().getChildren).toBeDefined() and one integration test per domain).

## Acceptance criteria

- `dal.ts` is a thin facade; domain logic lives in `src/lib/dal/supabase/*` (or equivalent structure).
- Shared DAL-related types live in one place; no duplicate type definitions across DAL and UI.
- No dead or demo-only code in DAL or its direct callers.
- README or JSDoc describes adapter interface and module layout; optional contract tests pass.

## How to test

1. **Unit**: `npm test` — all DAL and hook tests pass; no broken imports.
2. **Lint / typecheck**: `npx next lint`, `npm run typecheck` — pass.
3. **Build**: `npm run build` — succeeds.
4. **Manual**: Full flow — login, dashboard, check-in (in/out), rosters, household, register — data loads and mutations work as before.
5. **Contract**: If contract tests were added, run them and confirm they pass.
