## Context

Part of the [Comprehensive Application Audit](../COMPREHENSIVE-AUDIT-REPORT.md) sequencing. **Wave 1** contains isolated quick fixes with zero dependency on other work. Complete this wave first so the baseline is clean before starting demo mode removal or other refactors.

## Checklist

- [ ] **UX-04**: Fix `&apos;` in JS strings — In `check-in-view.tsx` and `child-card.tsx`, change `'Children&apos;s Church'` to use a plain apostrophe (e.g. `'Children\'s Church'`).
- [ ] **UX-10**: Fix CardGridSkeleton prop — Component expects `count`; callers pass `cards`. Either fix call sites to use `count={8}` (and similar) or rename the prop to `cards` in the component.
- [ ] **MAINT-08**: Remove duplicate AuthProvider — In `src/app/dashboard/layout.tsx`, remove the inner `<AuthProvider>` wrapper (line ~287). Root layout already provides it.
- [ ] **PERF-04**: Dynamic import ReactQueryDevtools — In `src/lib/queryClient.tsx`, use `next/dynamic` to load devtools and gate behind `process.env.NODE_ENV === 'development'`.
- [ ] **PERF-14**: Lazy state init for Sets — In `rosters/page.tsx` and `check-in/page.tsx`, change `useState<Set<string>>(new Set())` to `useState<Set<string>>(() => new Set())`.
- [ ] **PERF-05**: Parallelize roster fetches — In `src/app/dashboard/rosters/page.tsx`, start `getMinistries(true)` in parallel with `listRegistrationCycles()` (e.g. `Promise.all`), then await enrollments that depend on the cycle.
- [ ] **MAINT-22**: Remove deprecated `@supabase/auth-helpers-nextjs` — Remove from package.json; migrate any remaining usages to `@supabase/ssr`.
- [ ] **A11Y-13**: Add `lang="en"` to `src/app/global-error.tsx` on the `<html>` element.
- [ ] **USE-05**: Gate "Show Debug Info" on onboarding page behind `process.env.NODE_ENV !== 'production'`.
- [ ] **USE-06**: Fix unauthorized page redirect loop — Change "Go to Dashboard" link to `/` or make destination role-dependent so users redirected from dashboard don’t loop.

## Acceptance criteria

- All checklist items completed.
- No new lint or TypeScript errors.
- Existing tests pass.
- Manual smoke: login, dashboard load, check-in page, rosters page, unauthorized page, global error (trigger if possible).

## How to test

1. **Unit / lint**: `npm run lint`, `npm run typecheck`, `npm test`.
2. **UX-04**: Open check-in view and roster/child cards; event name must show "Children's Church" (curly apostrophe), not literal `&apos;`.
3. **UX-10**: Load dashboard and check-in; skeleton card count should match intent (e.g. 8 on check-in if that was the intended prop).
4. **MAINT-08**: Log in as admin; confirm dashboard and sidebar work; log out and back in — no duplicate auth state.
5. **PERF-04**: Production build; confirm ReactQueryDevtools is not in client bundle (e.g. bundle analyzer or network tab).
6. **PERF-05**: Dashboard → Rosters; ensure data loads and roster table/cards render without regression.
7. **USE-05**: In production build, "Show Debug Info" must not appear on onboarding.
8. **USE-06**: As a non-dashboard user, go to `/unauthorized`; "Go to Dashboard" (or equivalent) must not redirect back to `/unauthorized`.
