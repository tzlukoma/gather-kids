## Context

Part of the [Comprehensive Application Audit](../COMPREHENSIVE-AUDIT-REPORT.md) sequencing. **Wave 3** is the demo mode removal refactor. This is the main tracking issue; the full implementation plan lives in **#191**.

- **Parent issue**: [Remove Demo Mode Refactor #191](https://github.com/tzlukoma/gather-kids/issues/191)
- **Audit ref**: Resolves PERF-03, MAINT-12, MAINT-13, MAINT-16, MAINT-26, MAINT-27; reduces scope of MAINT-04, MAINT-05, MAINT-09, MAINT-17, PERF-18.

Complete Wave 2 (ESLint) before starting this so the refactor is lint-clean.

## Checklist (follow order in #191)

- [ ] **1. Feature flags and env** — Remove `DATABASE_MODE`, `SHOW_DEMO_FEATURES`, `isDemo()` from featureFlags.ts and authGuards.ts; update feature-flag context; update .env examples.
- [ ] **2. Database layer** — Factory always returns SupabaseAdapter; remove IndexedDB branch. dal.ts: remove `db` (Dexie) import and all demo branches; canonical-dal remove isDemo guard. Optionally keep indexed-db-adapter in repo but unused.
- [ ] **3. Auth flow** — Auth context: remove isDemo() and localStorage auth. Login: remove DEMO_USERS and quick-fill. ProtectedRoute: remove demo user reload. create-account, onboarding, settings/security, reset-password, callback: remove demo branches. dashboard-nav, forgot-password-dialog, settings-modal, household pages, register: remove demo logic.
- [ ] **4. API routes and libs** — me/photo, children/photo: remove isDemo branches. auth-utils, useDraftPersistence, bibleBee, onboarding-modal: remove demo references.
- [ ] **5. UI** — page.tsx: remove DATABASE_MODE checks and showDemoFeatures/SimpleSeedButton/FeatureFlagDialog. feature-flag-dialog: remove or repurpose. AuthDebug: remove demo display. middleware: update comments.
- [ ] **6. Tests** — jest.setup and mock auth guards: isDemo → false or remove. feature-flags, create-account, database-adapter-factory, dal-dashboard-functions, reset-password, avatar-storage, contracts, bible-bee-ministry: remove demo tests / use Supabase path; preserve coverage.
- [ ] **7. Scripts and E2E** — debug scripts: remove DATABASE_MODE / SHOW_DEMO_FEATURES. E2E: remove demo fallbacks; use Supabase (local/UAT) and seeded users.
- [ ] **8. Seed and types** — seed.ts: keep seed data, remove runtime demo gating. types.ts: update "demo" comments to "local" or "development" where appropriate.

## Acceptance criteria

- No references to `DATABASE_MODE`, `SHOW_DEMO_FEATURES`, `isDemo()`, or demo-only auth/DAL paths in production code paths.
- App runs only against Supabase (auth + DB); no IndexedDB adapter used at runtime.
- All existing tests updated and passing; E2E runs against Supabase (or documented test harness).
- Bundle no longer includes IndexedDB adapter (or it is tree-shaken unused).
- Docs/audit updated to reflect “Supabase only” (already reflected in audit doc).

## How to test

1. **Unit**: `npm test` — all pass.
2. **Lint**: `npx next lint` — pass.
3. **Build**: `npm run build` with Supabase env set — succeeds; inspect bundle for absence of Dexie/demo-only code if possible.
4. **Runtime**: Run app with Supabase only; login (password/magic/Google), dashboard, check-in, rosters, household, register — all work without demo mode.
5. **E2E**: Run E2E suite against local or UAT Supabase; auth and critical flows pass.
6. **Regression**: Confirm no "demo mode" or "IndexedDB" in UI or console in production build.
