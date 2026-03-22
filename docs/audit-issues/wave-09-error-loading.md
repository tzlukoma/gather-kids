## Context

Part of the [Comprehensive Application Audit](../COMPREHENSIVE-AUDIT-REPORT.md) sequencing. **Wave 9** adds route-level `error.tsx` and `loading.tsx` for better UX and consistency. Do after route restructure (Wave 8) so you add them once to the final structure.

**Prerequisite**: Wave 8 (route restructure) complete.

## Checklist

- [ ] **error.tsx**: Add `error.tsx` in `(admin)` layout (and optionally in key segments like `(admin)/check-in`, `(admin)/rosters`). Use React error boundary: display user-friendly message, "Try again" button that calls `reset()`, and optional "Go home" link. Log or report error in dev; avoid exposing stack in production.
- [ ] **loading.tsx**: Add `loading.tsx` in `(admin)` and in heavy segments (check-in, rosters). Show the same skeleton or spinner used in Wave 6 (shared loading pattern). Ensure no layout shift when content loads.
- [ ] **Global**: Confirm `app/global-error.tsx` exists and has `lang="en"` (Wave 1). Ensure root `layout.tsx` does not swallow errors; critical errors surface to global-error.
- [ ] **not-found**: Add or update `not-found.tsx` with consistent styling and link back to dashboard or home.

## Acceptance criteria

- Every (admin) route has a loading state (loading.tsx or inherited); no blank screen during fetch.
- Uncaught errors in (admin) show error boundary UI with recovery action; global-error catches root failures.
- not-found page is styled and offers navigation back.
- No layout shift when transitioning from loading to content.

## How to test

1. **Loading**: Navigate to check-in and rosters; observe skeleton/spinner then content; no flash of wrong layout.
2. **Error**: Temporarily throw in a page component (e.g. `throw new Error('test')`); confirm error boundary shows and "Try again" works. Remove throw after test.
3. **Global**: If possible, trigger an error in root layout; confirm global-error catches it.
4. **404**: Visit unknown path (e.g. `/admin/foo`); confirm not-found page and link work.
5. **Lint / build**: `npx next lint`, `npm run build` — pass.
