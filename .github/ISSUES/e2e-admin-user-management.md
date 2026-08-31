# E2E tests: Admin User Management feature

## Summary

Add Playwright e2e tests to cover the **Admin User Management** flow (Create User, Set Password, Confirm Email, Promote to Admin, and access control). The feature is implemented and covered by unit/integration tests; e2e coverage was removed and should be re-added once the test environment and auth flow are set up correctly.

## Feature under test

- **Page:** `/dashboard/users` (User Management)
- **Entry:** Admin only; non-admins see “Access denied”.
- **Actions:** Create user (dialog), Set password (dialog), Confirm email (button), Promote to Admin (button).

Relevant code:

- `src/app/dashboard/users/page.tsx` – Users management page
- `src/components/admin/create-user-dialog.tsx` – Create User dialog
- `src/components/admin/set-password-dialog.tsx` – Set Password dialog
- `src/app/api/users/create/route.ts` – POST create user
- `src/app/api/users/[userId]/route.ts` – PATCH update user (role, email_confirmed, password)

## E2E tests to add

### 1. Admin access and navigation

- **As:** Admin (seeded admin on local or UAT Supabase).
- **Steps:** Log in as admin → go to User Management (sidebar link or `/dashboard/users`).
- **Assert:** “User Management” heading and “Create User” button are visible.

### 2. Create User (happy path)

- **As:** Admin.
- **Steps:** Open “Create User” → fill email, password, full name (optional), role (e.g. GUEST), leave “Mark email as confirmed” checked → submit.
- **Assert:** Success toast (e.g. “User created successfully”); new user row appears in the table with the given email (when backend is available).

### 3. Create User (validation / error handling)

- **As:** Admin.
- **Steps:** Open “Create User” → submit with empty or invalid data (e.g. short password).
- **Assert:** Validation message or error toast; dialog stays open or closes with clear feedback.

### 4. Set Password

- **As:** Admin.
- **Steps:** On User Management, click “Set Password” for a user → fill new password → submit (and, if changing own password, confirm “I understand I will be signed out”).
- **Assert:** Success toast (e.g. “Password updated successfully”); dialog closes.

### 5. Confirm Email

- **As:** Admin.
- **Steps:** On User Management, click “Confirm Email” for a user with unconfirmed email.
- **Assert:** Success toast; user’s status reflects confirmed (or button disappears).

### 6. Promote to Admin

- **As:** Admin.
- **Steps:** On User Management, click “Promote to Admin” for a non-admin user.
- **Assert:** Success toast (e.g. “Successfully promoted … to ADMIN”); user’s role shows as Admin (or “Promote to Admin” is no longer shown for that row).

### 7. Non-admin access denied

- **As:** Non-admin (e.g. a seeded ministry leader account).
- **Steps:** Log in → go to `/dashboard/users`.
- **Assert:** “Access denied” (or equivalent) message; no “Create User” button or user table.

## Environment and setup

- **Auth:** Tests need a way to run as admin and as non-admin. Prefer reusing existing patterns (e.g. `tests/playwright/page-objects/login.page.ts` with `loginAsAdmin()` / `loginAsUser(...)`).
- **Backend:** User Management calls `/api/users` and `/api/users/create`; these use Supabase. For e2e, run against **local Supabase** (`supabase start` + `npm run seed:dev`) or **UAT** with seeded users. There is no demo mode / `DATABASE_MODE=demo`.
- **Server:** Start the app under test via Playwright `webServer` or assume it is already running (document port/env). Use `.env.e2e.local` (see `.env.e2e.local.example`) pointing at local or UAT Supabase.
- **Stability:** On full page load to `/dashboard/users`, auth may restore asynchronously; tests should wait for the User Management content (e.g. “Create User” button or “User Management” heading) or for “Access denied” before asserting. Prefer stable selectors (e.g. `getByRole('button', { name: /create user/i })`, `getByRole('heading', { name: 'User Management' })`).

## Suggested implementation

- **Location:** e.g. `tests/playwright/admin-user-management.spec.ts` (or under `e2e/` if using `e2e.config.ts`).
- **Page object:** A small page object for User Management (navigate, open Create User, fill Create User form, submit, open Set Password for a row, fill Set Password, submit, click Confirm Email / Promote to Admin for a row) keeps specs readable.
- **Config:** Reuse existing Playwright config. Local e2e: `npm run test:e2e:local` with `.env.e2e.local` against local or UAT Supabase.

## Acceptance criteria

- [ ] All 7 scenarios above are covered by at least one e2e test each.
- [ ] Tests run in CI or locally via a single command (e.g. `npm run test:e2e:admin` or `npm run test:e2e:local` with a filter).
- [ ] Documentation (README or .env example) states how to run the app against local or UAT Supabase and how to run these e2e tests.

## Notes

- There is no `npm run dev:demo` and no `DATABASE_MODE`. `.env.e2e.local.example` points at local Supabase.
- Existing login page object: `tests/playwright/page-objects/login.page.ts` (e.g. `loginAsAdmin()`, `loginAsUser(email, password)`).
- Unit/integration tests for the same feature live under `__tests__/` and pass; e2e should complement them by covering the full browser flow and auth.
