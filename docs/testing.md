# Testing Guide

## Overview

gatherKids uses two complementary test layers:

| Layer | Tool | Command | Purpose |
|-------|------|---------|---------|
| Unit / integration | Jest + React Testing Library | `npm test` | Component logic, hooks, utilities |
| End-to-end (E2E) | Playwright | `npx playwright test` | Full browser flows |

---

## Unit and integration tests

```bash
# Run all Jest tests
npm test

# Watch mode (re-runs on save)
npm run test:watch
```

Test files live in `__tests__/` at the project root and in co-located `*.test.ts(x)` files alongside source files.

### What is covered

- Authentication context and hooks
- React Query data-fetching hooks
- Supabase adapter utilities
- Registration form validation
- Bible Bee feature logic

---

## End-to-end tests (Playwright)

```bash
# Install browsers (first time only)
npx playwright install

# Run all E2E tests
npx playwright test

# Run with UI mode (interactive)
npx playwright test --ui
```

E2E spec files:

| File | Scope |
|------|-------|
| `e2e/smoke-test.spec.ts` | Navigate to create account and registration pages |
| `e2e/auth-registration.spec.ts` | Email/password authentication + registration flow |
| `e2e/simplified-registration.spec.ts` | Simplified registration path |
| `e2e/browser-config-test.spec.ts` | Browser configuration smoke tests |
| `tests/playwright/bible-bee-e2e.spec.ts` | Bible Bee feature end-to-end |
| `tests/playwright/email/email-password-verification.spec.ts` | Email verification flow |

---

## E2E coverage status — login → check-in → roster view (PERF-18)

**Current status: NOT COVERED**

The critical user journey of:
1. Log in as a ministry leader
2. Navigate to the check-in view
3. Check in a child
4. View the attendance roster

...is **not covered by any existing E2E test** as of March 2026.

Existing E2E tests focus on:
- Unauthenticated navigation (smoke tests)
- Account creation and email verification
- The registration form flow
- Bible Bee scripture management

### Recommended follow-up

Create a new Playwright spec (e.g. `e2e/checkin-roster.spec.ts`) that covers:

- [ ] Leader logs in with email/password credentials
- [ ] Navigates to a ministry's check-in view
- [ ] Checks in at least one child
- [ ] Verifies the child appears on the roster/attendance list
- [ ] Leader logs out

This spec should be added to the CI workflow (`.github/workflows/ci.yml`) once the Supabase test environment is stable. See `docs/DATABASE_ENV_SETUP_GUIDE.md` for environment configuration.

---

## Build verification

```bash
# Full production build (must pass before merging)
npm run build

# TypeScript type check only (no emit)
npm run typecheck

# ESLint
npm run lint
```

Both `npm run build` and `npm test` are required to pass on every pull request (enforced by `.github/workflows/ci.yml`).

---

## Related documentation

- [COMPREHENSIVE-AUDIT-REPORT.md](./COMPREHENSIVE-AUDIT-REPORT.md) — full audit findings
- [audit-wave-status.md](./audit-wave-status.md) — wave implementation status
- [DATABASE_ENV_SETUP_GUIDE.md](./DATABASE_ENV_SETUP_GUIDE.md) — Supabase environment setup for E2E
