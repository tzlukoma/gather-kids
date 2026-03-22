## Context

Part of the [Comprehensive Application Audit](../COMPREHENSIVE-AUDIT-REPORT.md) sequencing. **Wave 8** implements the route restructure for **UX-15**: flat feature routes under an `(admin)` route group so URLs are `/check-in`, `/rosters`, etc., instead of `/dashboard/check-in`. This avoids misleading nesting and improves shareability/bookmarks.

**Prerequisite**: Waves 1–7 done; no hard dependency on demo mode.

## Checklist

- [ ] **Route group**: Create `(admin)` (or keep existing group name) at app root; move current `dashboard` children (e.g. `check-in`, `rosters`, `household`, `register`, `settings`, etc.) to be direct children of `(admin)`. Result: `app/(admin)/check-in/page.tsx`, `app/(admin)/rosters/page.tsx`, etc. Keep shared layout in `(admin)/layout.tsx` (sidebar, auth, etc.).
- [ ] **Redirect**: Add or update redirect so `/dashboard` and `/dashboard/*` redirect to `/(admin)/*` (e.g. `/dashboard/check-in` → `/check-in`) to preserve old links.
- [ ] **Navigation**: Update `src/lib/navigation.ts` (and any other href constants) so all links point to the new flat routes: `/check-in`, `/rosters`, `/household`, `/register`, `/settings`, etc. Remove `/dashboard/` prefix from hrefs.
- [ ] **References**: Grep for `/dashboard/` in components, middleware, and tests; replace with new paths. Update any `router.push` or `Link` that still use `/dashboard/...`.
- [ ] **Auth / middleware**: Ensure middleware and protected routes allow the new paths (e.g. `/check-in` is protected same as `/dashboard/check-in`). No redirect loops.
- [ ] **Tests**: Update E2E and any unit tests that assert on `/dashboard/...` URLs; assert on new URLs. Update sitemap or docs if they list routes.

## Acceptance criteria

- All feature pages live under `(admin)` with flat paths: `/check-in`, `/rosters`, `/household`, `/register`, `/settings`, etc.
- Visiting `/dashboard` or `/dashboard/check-in` redirects to `/check-in` (or equivalent).
- All in-app navigation uses the new hrefs; no remaining `/dashboard/` in navigation.ts or Link components.
- Middleware and auth treat new paths correctly; no loops.
- Tests and docs updated; CI passes.

## How to test

1. **Manual**: Log in; click every sidebar link — each goes to `/check-in`, `/rosters`, etc. (no `/dashboard/` in URL bar).
2. **Manual**: Paste `/dashboard/check-in` in URL bar — redirects to `/check-in`.
3. **Manual**: Log out and try `/check-in` — redirects to login; after login, lands on `/check-in`.
4. **E2E**: Run E2E suite; fix any assertions on old URLs.
5. **Lint / build**: `npx next lint`, `npm run build` — pass.
