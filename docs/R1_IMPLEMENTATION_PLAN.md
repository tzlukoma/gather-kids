# R1 Implementation Plan — Returning-Family Registration (Fall 2026)

**Status:** Execution runbook  
**Prerequisite:** **Complete [`docs/CI_CD_CLEANUP_PLAN.md`](./CI_CD_CLEANUP_PLAN.md) first** — merge cleanup PR to `main`, verify unified CI green, and run one UAT DB deploy. Do not start R1 Phase 0 until CI/CD cleanup is done.  
**Canonical product context:** [`docs/PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) § R1  
**Goal:** The 56 Fall 2025 families can sign in, see last year’s children, add/remove kids, change ministries and consents, and land on `/household` enrolled in **Fall 2026**.

This document is written so an agent can execute **Phases 1–4 autonomously** after you complete **Phase 0 (prerequisites)**. Every prerequisite includes *done-when* criteria and a *validation* step the agent runs before writing code.

---

## How to use this document

| Phase | Owner | Outcome |
|-------|-------|---------|
| **0 — Prerequisites** | Thomas | UAT looks like prod, secrets + test accounts exist, decisions recorded |
| **1 — Code** | Agent | All R1 workstreams merged on a feature branch |
| **2 — Automated tests** | Agent | Jest + Playwright (`e2e/r1/`) green before handoff |
| **3 — UAT proof** | Agent | One-shot `scripts/r1/phase3-validate.sh` (Playwright + SQL) |
| **4 — Ship** | Thomas | Review PR, merge to **`main`**, deploy, prod cycle flip when ready |

**Kickoff prompt for the agent (after Phase 0):**

> Execute `docs/R1_IMPLEMENTATION_PLAN.md` through Phase 3 **without asking Thomas to manually click through flows**. Run `scripts/r1/phase0-validate.sh`, implement code, then loop on `scripts/r1/phase3-validate.sh` until green. Only report back when the PR is ready to merge. Do not activate Fall 2026 on production. Stop and report if any Phase 0 gate fails.
>
> **Preview feedback loop:** When Thomas is testing on Vercel Preview, every fix must be **validated locally first** (scoped Jest/Playwright against UAT-backed dev), then **committed and pushed** to the open PR so Preview redeploys. Never push untested changes for Thomas to discover on Preview.
>
> **Commits / PR title:** Use [Conventional Commits](https://www.conventionalcommits.org/) on every commit and squash-merge PR title (`feat:`, `fix:`, etc.) — required by release-please on `main`. See `docs/CI_CD_CLEANUP_PLAN.md`.

---

## Current state (baseline)

| Area | Today | Blocks R1 |
|------|-------|-----------|
| Active cycle | `Fall 2025` / `e3a387b5-de59-4e37-a52a-b9e9102dc45c` | Need inactive `Fall 2026` on UAT for testing |
| Cycle ID format | UUID in prod | `'2025'` fallbacks and `parseInt(cycle_id) - 1` are broken |
| Prefill load | `findHouseholdByEmail` scans **all** guardians; unauthenticated email lookup leaks PII | Must be login-first |
| Submit | `isPrefill` skips child create/deactivate, enrollment rewrite, `user_households` | Returning submit fails on add-child |
| Consents on prefill | Hardcoded `true` in `fetchFullHouseholdDataFromAdapter` | Parents must re-sign |
| Grades | Mixed strings (`3`, `3rd`, `K`, `PreK-4`, `-1`) | Need canonicalize + confirm UI |
| Choir | Age bands 4–8 / 9–12 / 13–18 | Must not copy last year’s choir row |
| Auth submit | Unauthenticated `/register` still submits ([#185](https://github.com/tzlukoma/gather-kids/issues/185)) | Must require session |
| E2E | New-family flow exists; no returning-family Playwright | Must add |

**Key files (agent will touch):**

- `src/lib/dal/households.ts` — prefill + prior cycle resolution
- `src/lib/dal/ministries.ts` — `getCurrentRegistrationCycle`, new `getPriorRegistrationCycle`
- `src/lib/database/canonical-dal.ts` — submit semantics (`isPrefill` removal)
- `src/lib/dal/registration.ts` — parallel legacy path (keep in sync or delete dead branch)
- `src/app/register/page.tsx` — login-first load, auth gate, grade confirm, choir logic
- `src/lib/gradeUtils.ts` — add `canonicalizeGradeForStorage` (store consistent codes)
- `src/components/gatherKids/dashboard-nav.tsx` — remove `'2025'` fallback
- `e2e/returning-registration.spec.ts` — new spec
- `scripts/db/r1-prerequisites-check.sql` — Phase 0 gate queries

---

## Phase 0 — Prerequisites (Thomas)

Complete **all** items below before handing work to the agent. Estimated time: 2–4 hours if UAT restore is already familiar.

### P0.1 — Git branch

**Do:**

```bash
cd /Users/Thomas/DEV/source_code/_currentProjects/gather-kids
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/r1-returning-registration
```

**Done when:** `git branch --show-current` prints `feature/r1-returning-registration`.

**Agent validates:**

```bash
git branch --show-current
git log -1 --oneline
```

---

### P0.2 — UAT database with production-shaped data

R1 proof requires real-ish household shapes (56 families, UUID cycles, mixed grades). Local Supabase seed scripts **do not** reproduce this.

**Do (recommended path):**

1. **Backup production** (maintenance window; you run this — agent must not receive prod `service_role`):

   ```bash
   pg_dump "$PROD_DATABASE_URL" -Fc -f "prod-backup-$(date +%Y%m%dT%H%M%S).dump"
   ```

2. **Restore into UAT** (Supabase dashboard → UAT project → pause if needed → restore, **or** CLI):

   ```bash
   pg_restore --clean --if-exists --no-owner --no-acl \
     -d "$UAT_DATABASE_URL" prod-backup-YYYYMMDD.dump
   ```

   Prefer restoring **schema + data** for: `households`, `guardians`, `children`, `registrations`, `ministry_enrollments`, `registration_cycles`, `user_households`, `ministries`, `ministry_groups`, `auth.users` (if your restore includes auth — required for login tests).

3. **Sanitize UAT auth passwords** for test accounts you will use (Supabase dashboard → Authentication → Users → reset password for 3 test guardians). Do **not** commit passwords.

4. Point local UAT env at the restored project (see P0.4).

**Alternative (lighter, less faithful):** Run [`scripts/db/prod-registration-inventory.sql`](./../scripts/db/prod-registration-inventory.sql) on prod, then manually seed UAT with anonymized copies of 5–10 households. Acceptable for early dev; **not** sufficient for final R1 sign-off (need full 56 or a documented subset).

**Done when:** UAT has Fall 2025 cycle `e3a387b5-de59-4e37-a52a-b9e9102dc45c`, ≥50 households with children, ≥90 children, ≥50 `user_households` links.

**Agent validates:** run [`scripts/db/r1-prerequisites-check.sql`](../scripts/db/r1-prerequisites-check.sql) with `DATABASE_URL=$UAT_DATABASE_URL` (see P0.4). Section `uat_baseline` must pass.

---

### P0.3 — Create Fall 2026 cycle on UAT (inactive)

**Do** (Supabase UAT SQL editor):

```sql
INSERT INTO registration_cycles (cycle_id, name, start_date, end_date, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Fall 2026',
  '2026-09-13',
  '2027-06-30',
  false,
  now(),
  now()
)
RETURNING cycle_id, name, is_active;
```

Copy the returned `cycle_id` UUID into your manifest (P0.4).

**Important:**

- Leave **Fall 2025 active** on UAT until Phase 3 tests explicitly flip activation.
- Do **not** create cycle id `'2026'` or `'2025'`.
- Do **not** use `scripts/seed/registration-cycle.js` against UAT/prod (wrong id format).

**Done when:** Two cycles exist; exactly one active (Fall 2025); Fall 2026 `is_active = false`.

**Agent validates:** `r1-prerequisites-check.sql` section `fall_2026_cycle`.

---

### P0.4 — Local manifest (secrets + IDs)

Create a **gitignored** file the agent reads at the start of every session:

**Path:** `.r1-local/manifest.json`  
(add `.r1-local/` to `.gitignore` if not already ignored via `.env*` rules — create the directory locally)

**Template:**

```json
{
  "uat": {
    "supabase_url": "https://YOUR-UAT-PROJECT.supabase.co",
    "anon_key": "eyJ...",
    "service_role_key": "eyJ...",
    "database_url": "postgresql://postgres:...@db.YOUR-UAT-PROJECT.supabase.co:5432/postgres"
  },
  "cycles": {
    "fall_2025_id": "e3a387b5-de59-4e37-a52a-b9e9102dc45c",
    "fall_2026_id": "PASTE-UUID-FROM-P0.3"
  },
  "test_accounts": {
    "returning_guardian": {
      "email": "parent-with-household@example.com",
      "password": "TestPassword123!",
      "household_id": "optional-for-spot-checks",
      "child_count": 2,
      "notes": "Real UAT account linked via user_households; has Fall 2025 enrollments"
    },
    "new_guardian": {
      "email": "brand-new@example.com",
      "password": "TestPassword123!",
      "notes": "Auth user with NO user_households row"
    },
    "shared_email_guardian": {
      "email": "optional-shared@example.com",
      "password": "TestPassword123!",
      "notes": "Only if you restored prod; email on 2 households — backup lookup edge case"
    }
  },
  "decisions": {
    "grade_bump": "prompt_confirm",
    "unauthenticated_register": "redirect_to_login",
    "email_lookup_without_session": "disabled",
    "activate_fall_2026_on_uat_after_tests": true
  },
  "app": {
    "uat_base_url": "https://your-uat-preview.vercel.app",
    "local_base_url": "http://localhost:9002"
  }
}
```

**Also create** `.env.r1.local` for Next.js pointed at UAT (gitignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-UAT-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:...@db.YOUR-UAT-PROJECT.supabase.co:5432/postgres
```

**Done when:** Both files exist locally; manifest JSON parses; UAT URL loads in browser.

**Agent validates:**

```bash
test -f .r1-local/manifest.json && node -e "JSON.parse(require('fs').readFileSync('.r1-local/manifest.json','utf8'))"
psql "$DATABASE_URL" -f scripts/db/r1-prerequisites-check.sql
curl -s -o /dev/null -w "%{http_code}" "$UAT_BASE_URL/api/health"   # expect 200 if deployed
```

---

### P0.5 — Test accounts (three scenarios)

Create or reset these in **UAT Supabase Auth** after the restore.

| Account | Purpose | Setup |
|---------|---------|--------|
| **returning_guardian** | Happy path | Must have `user_households` row + ≥1 active child + Fall 2025 enrollments |
| **new_guardian** | New family | Auth user exists, **no** `user_households`, no prior registrations |
| **shared_email_guardian** (optional) | Edge case | Only if prod duplicate emails were restored; documents expected behavior |

**Do:**

1. Supabase → Authentication → Add user (or reset password on restored user).
2. For `returning_guardian`, confirm link:

   ```sql
   SELECT uh.auth_user_id, uh.household_id, g.email
   FROM user_households uh
   JOIN guardians g ON g.household_id = uh.household_id AND g.is_primary = true
   WHERE g.email ILIKE 'parent-with-household@example.com';
   ```

3. Record emails/passwords in manifest only — never commit.

**Done when:** You can log into UAT app as `returning_guardian` and reach `/household` with children visible.

**Agent validates:** Playwright login helper or manual SQL join returns one row for returning account.

---

### P0.6 — Product decisions (record in manifest)

Set `decisions` in manifest (agent implements accordingly):

| Key | Recommended value | Meaning |
|-----|-------------------|---------|
| `grade_bump` | `"prompt_confirm"` | On prefill, show “Confirm this year’s grade” with suggested bump from last year; parent can override |
| `unauthenticated_register` | `"redirect_to_login"` | `/register` requires session before submit ([#185](https://github.com/tzlukoma/gather-kids/issues/185)) |
| `email_lookup_without_session` | `"disabled"` | No PII prefill from email field without verified session |
| `activate_fall_2026_on_uat_after_tests` | `true` | Agent may flip active cycle on UAT only after e2e pass |

If you choose different values, note them in manifest `decisions.notes`.

**Done when:** `manifest.json` → `decisions` object is complete.

**Agent validates:** reads manifest; no ambiguity before coding.

---

### P0.7 — Local dev / E2E stack (for agent self-validation)

**Do:**

```bash
# From repo root
supabase status --output env    # local stack optional; UAT tests use manifest DATABASE_URL
cp .env.e2e.local.example .env.e2e.local   # if missing; fill from supabase status
npm ci
```

**Done when:** `npm test -- --testPathPattern=canonical-dal` passes; `npm run dev` serves `http://localhost:9002`.

**Agent validates:** Jest smoke + dev server 200 (see `.claude/skills/e2e/SKILL.md`).

---

### P0.8 — UAT deploy preview (optional but speeds Phase 3)

Deploy branch to Vercel preview wired to UAT Supabase, or use existing UAT URL. Put URL in `manifest.app.uat_base_url`.

**Done when:** Preview uses UAT env vars (not prod).

**Agent validates:** registration page loads; Supabase project ref in network tab matches UAT.

---

## Phase 0 — Agent validation gate (run before any code changes)

Execute in order. **Stop** if any step fails and report to Thomas.

```bash
cd /Users/Thomas/DEV/source_code/_currentProjects/gather-kids

# 1. Manifest
test -f .r1-local/manifest.json
node -e "const m=require('./.r1-local/manifest.json'); if(!m.cycles.fall_2026_id) throw new Error('missing fall_2026_id')"

# 2. Database
export DATABASE_URL="$(node -pe "require('./.r1-local/manifest.json').uat.database_url")"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/r1-prerequisites-check.sql

# 3. Unit baseline
npm test -- --testPathPattern='canonical-dal|gradeUtils|registration' --passWithNoTests

# 4. Grep guards — document count; should be >0 before, 0 after Phase 1
rg "cycle_id \|\| '2025'|parseInt\(currentCycleId" src --count-matches
```

Expected SQL output: JSON with `"phase0_pass": true`.

---

## Phase 1 — Implementation (Agent)

Workstreams are ordered by dependency. One PR on `feature/r1-returning-registration` is fine; split only if review size exceeds ~800 lines.

### WS1 — Cycle resolution utilities

**Tasks:**

1. Add `getPriorRegistrationCycle(currentCycleId: string)` in `src/lib/dal/ministries.ts`:
   - Load all cycles sorted by `start_date` descending.
   - Prior = first cycle with `start_date < current.start_date` (not numeric id math).
2. Add `requireActiveRegistrationCycle()` that throws/shows error UI if none active (no `'2025'` fallback).
3. Replace every `cycle_id || '2025'` in:
   - `src/app/register/page.tsx`
   - `src/components/gatherKids/dashboard-nav.tsx`
   - any other `rg` hits
4. Fix `findHouseholdByEmail` prior lookup to use `getPriorRegistrationCycle`.

**Acceptance:**

- `rg "cycle_id \|\| '2025'" src` → 0 matches
- `rg "parseInt\(currentCycleId" src` → 0 matches
- Unit tests for prior-cycle with two UUID cycles

---

### WS2 — Login-first household load

**Tasks:**

1. Add `loadHouseholdForRegistration(authUserId, currentCycleId)` in `households.ts`:
   - Resolve `household_id` via `getHouseholdForUser`.
   - If found and household has ≥1 active child → `fetchFullHouseholdDataFromAdapter(householdId, priorCycleIdOrCurrent)`.
   - Skip empty shells (0 children).
2. Replace authenticated path in `register/page.tsx`:
   - Stop calling `findHouseholdByEmail(user.email)` on login.
   - Call new loader instead.
3. Unauthenticated `/register`:
   - If `decisions.unauthenticated_register === "redirect_to_login"` → redirect to login with `?next=/register`.
   - Email lookup field: only for users who will magic-link (new families); **never** prefill without session.
4. Remove or gate mock security-question step (`VerificationStepTwoForm`); real backup = magic link only.

**Acceptance:**

- Logged-in returning guardian sees prefilled children without typing email.
- Unauthenticated user cannot see another household’s data.
- `findHouseholdByEmail` no longer calls `listGuardians('')` — add `listGuardiansByEmail(email)` on adapter with indexed query.

---

### WS3 — Submit semantics (fix `isPrefill`)

**Tasks:**

1. Remove `isPrefill` parameter from `registerHouseholdCanonical` (or rename to `sourceCycleId` used **only** for read, never to skip writes).
2. Submit must **always**:
   - Upsert household/guardians/emergency contact
   - `createChild` when `child_id` not in DB; `updateChild` when exists
   - Deactivate removed children
   - Delete + recreate enrollments/registrations for **target** `cycle_id` only
   - Ensure `user_households` exists (idempotent)
   - Assign GUARDIAN role if missing
3. Mirror critical fixes in `src/lib/dal/registration.ts` if still referenced, or delete dead path.
4. Fix `isExistingChild` in register UI: new children have fresh UUIDs but are not “existing DB rows” — use `existingChildIds` set loaded at prefill time.

**Acceptance:**

- Returning family: add child → submit → new row in `children`, new Fall 2026 registration.
- Remove child → submit → `is_active = false`, no Fall 2026 enrollment.
- Re-submit idempotent (no duplicate enrollments for same cycle).

---

### WS4 — Consents

**Tasks:**

1. `fetchFullHouseholdDataFromAdapter`: return `consents: { liability: false, photoRelease: false }` for prefill (never hardcode true).
2. Block submit unless both consents checked (existing Zod schema — verify).
3. Write consent JSON to `registrations.consents` in canonical format on submit.

**Acceptance:**

- Prefill shows consents unchecked.
- DB consents reflect new signature timestamps after submit.

---

### WS5 — Grade canonicalization + confirm UI

**Tasks:**

1. Add `canonicalizeGradeForStorage(gradeText): string` → store as `-1|0|1..12` string (consistent with prod numeric strings).
2. On prefill, map legacy values via `gradeToCode` / `gradeCodeToLabel`.
3. If `decisions.grade_bump === "prompt_confirm"`:
   - Compute suggested grade (code + 1 capped at 12; Pre-K stays until parent confirms).
   - Show inline banner per child: “Last year: X → Suggested this year: Y”.
4. Validate grade on submit; reject unparseable grades with field error.

**Acceptance:**

- Prod mixed grades display correctly after prefill.
- Stored grade after submit is canonical code string.

---

### WS6 — Choir re-placement

**Tasks:**

1. When prefilling from prior cycle, **do not** copy choir ministry codes into `ministrySelections`.
2. On submit, evaluate choir eligibility from DOB + ministry min/max age; enroll only if parent selects and child qualifies.
3. Unit test: age 9 → Joy Bells band, age 13 → teen choir band.

**Acceptance:**

- Last year’s teen choir selection does not auto-carry to a child who aged into a different band.

---

### WS7 — Guardian onboarding redirect ([#187](https://github.com/tzlukoma/gather-kids/issues/187))

**Tasks:**

- Find hard redirect to `/dashboard` after guardian signup; change to `/household` (or `/register` if registration incomplete).

**Acceptance:**

- New guardian magic-link → password setup → lands on `/household` or `/register`, not `/check-in`.

---

### WS8 — Auth required to submit ([#185](https://github.com/tzlukoma/gather-kids/issues/185))

**Tasks:**

- Guard `onSubmit` and server-side if any API route involved: no session → error + redirect login.
- Remove silent “create orphan household” path for unauthenticated submit.

**Acceptance:**

- Playwright: unauthenticated form fill → submit blocked.

---

## Phase 2 — Automated tests (Agent)

### Unit / integration (Jest)

| File | Covers |
|------|--------|
| `__tests__/lib/registration-cycles.test.ts` (new) | prior cycle, active cycle required |
| `__tests__/lib/household-prefill.test.ts` (new) | login-first loader, empty shell skipped |
| `__tests__/lib/canonical-dal.test.ts` (extend) | returning submit add/remove child |
| `__tests__/lib/gradeUtils.test.ts` (extend) | prod grade variants → canonical storage |

Run:

```bash
npm test -- --testPathPattern='registration-cycles|household-prefill|canonical-dal|gradeUtils'
```

### E2E (Playwright)

Human-use coverage lives in **`e2e/r1/`** (shared helpers in `e2e/utils/r1-helpers.ts`):

| Spec | Covers |
|------|--------|
| `auth-gates.spec.ts` | Login redirect, bad password, `/register` auth gate, household→register redirect |
| `prefill-and-consents.spec.ts` | Address/children prefill, consents unchecked, grade hints |
| `form-validation.spec.ts` | Consent required, partial consents, cleared address |
| `form-interactions.spec.ts` | Edit fields, add child, reload session, no email lookup when signed in |
| `new-guardian.spec.ts` | Empty household, email prefilled, initial child row |
| `submit-and-household.spec.ts` | Full submit → `/household` (`@mutating`, writes UAT data) |

Run (local against UAT-backed dev):

```bash
# Dev server: set -a && source .env.r1.local && set +a && npm run dev
R1_E2E_ENABLED=1 npx playwright test e2e/r1/ --config=e2e.config.ts

# Read-only subset (no submit / DB writes):
R1_E2E_ENABLED=1 npx playwright test e2e/r1/ --grep-invert @mutating

# Full one-shot (Jest + Playwright + SQL):
./scripts/r1/phase3-validate.sh
```

**Phase 2 pass criteria:** all new tests green; no regressions in `e2e/smoke-test.spec.ts` and `e2e/auth-registration.spec.ts`.

---

## Phase 3 — UAT proof (Agent, one-shot)

Thomas does **not** manually click through registration. The agent runs `./scripts/r1/phase3-validate.sh` in a loop until it passes, then opens a PR.

Use UAT DB + local dev (`set -a && source .env.r1.local && set +a && npm run dev`) or deployed preview.

### 3.1 — Automated gate (`scripts/r1/phase3-validate.sh`)

1. Jest: registration-related unit tests
2. Playwright: entire `e2e/r1/` suite (includes `@mutating` submit tests)
3. SQL assertions (post-submit): Fall 2026 registrations ≥ 1, no duplicate enrollments

### 3.2 — SQL assertions (also embedded in phase3 script)

Run (replace household id from manifest):

```sql
-- Fall 2026 registrations for returning household
SELECT count(*) AS reg_2026
FROM registrations r
JOIN children c ON c.child_id = r.child_id
WHERE c.household_id = :household_id
  AND r.cycle_id = :fall_2026_id;

-- No duplicate active enrollments same ministry/cycle/child
SELECT child_id, ministry_id, count(*)
FROM ministry_enrollments
WHERE cycle_id = :fall_2026_id
GROUP BY 1, 2
HAVING count(*) > 1;
```

Expect: `reg_2026 >= 1`, duplicate query returns 0 rows.

### 3.3 — Activate Fall 2026 on UAT (Thomas or agent after 3.1 passes)

If `manifest.decisions.activate_fall_2026_on_uat_after_tests`:

```sql
UPDATE registration_cycles SET is_active = false WHERE cycle_id = :fall_2025_id;
UPDATE registration_cycles SET is_active = true  WHERE cycle_id = :fall_2026_id;
```

Re-run `./scripts/r1/phase3-validate.sh` after activation.

**Phase 3 pass criteria:** `phase3-validate.sh` exits 0; PR description includes test household id (non-PII) and cycle UUIDs.

---

## Phase 4 — Ship (Thomas)

R1 code merges to **`main`** after UAT Preview smoke (`docs/R1_UAT_SMOKE.md`). **Do not** email families until PRODUCT_SPEC R2 items are addressed or explicitly accepted.

| Step | Action |
|------|--------|
| 1 | Agent opens PR → Vercel Preview deploys |
| 2 | **Thomas:** ~10 min checklist in [`docs/R1_UAT_SMOKE.md`](./R1_UAT_SMOKE.md) on Preview URL |
| 3 | Optional: `BASE_URL=https://preview… ./scripts/r1/uat-preview-smoke.sh` (read-only Playwright) |
| 4 | Merge PR to **`main`**; UAT app deploys |
| 5 | Prod: insert **inactive** Fall 2026 (same as P0.3) before prod app deploy |
| 6 | Deploy prod app |
| 7 | Run returning registration with **your own** household on prod |
| 8 | Flip `is_active` to Fall 2026 when ready to open registration |
| 9 | Monitor daily digest + admin registrations |

**Prod activation SQL** (when ready):

```sql
UPDATE registration_cycles SET is_active = false
WHERE cycle_id = 'e3a387b5-de59-4e37-a52a-b9e9102dc45c';

UPDATE registration_cycles SET is_active = true
WHERE name = 'Fall 2026';
```

---

## Definition of done (R1 complete)

- [x] All Phase 0 gates pass on a fresh agent session
- [x] No `'2025'` cycle fallbacks; prior cycle by date ordering
- [x] Login-first prefill for all `user_households` guardians
- [x] No unauthenticated PII leak via email lookup
- [x] Returning submit: add/remove child, grade change, ministry change, consents re-signed
- [x] Choir not blind-copied from prior year
- [x] Jest + Playwright `e2e/r1/` green (`phase3-validate.sh`)
- [x] UAT SQL assertions pass
- [ ] Thomas UAT Preview smoke (`docs/R1_UAT_SMOKE.md`) — **blocks prod**
- [ ] `docs/PRODUCT_SPEC.md` R1 items struck or marked shipped (optional doc PR)

---

## Appendix A — Agent troubleshooting

| Failure | Likely cause | Fix |
|---------|--------------|-----|
| Prefill empty after login | No `user_households` / wrong UAT user | P0.5 SQL check |
| Prior cycle not found | Fall 2026 start_date ≤ Fall 2025 | Fix dates in P0.3 |
| `updateChild` fails on add | `isPrefill` still true on submit | WS3 |
| Playwright login fails | Wrong password / auth not restored | Reset in Supabase |
| Rosters empty after activate | No Fall 2026 enrollments yet | Expected until families register |

---

## Appendix B — Out of scope for R1 (do not block PR)

- RLS / #183 / #184 (R2)
- Bible Bee cycle creation for 2026 (separate admin task)
- Full 56-household automated run (manual spot-check OK if e2e uses one canonical household)
- Leftover IndexedDB / demo file cleanup (#266)
- Production mass email blast

---

## Appendix C — Related scripts

| Script | Purpose |
|--------|---------|
| [`scripts/r1/phase0-validate.sh`](../scripts/r1/phase0-validate.sh) | Phase 0 DB + unit test gate |
| [`scripts/r1/phase3-validate.sh`](../scripts/r1/phase3-validate.sh) | One-shot Phase 3 (Jest + Playwright + SQL) |
| [`scripts/db/r1-post-registration-check.sql`](../scripts/db/r1-post-registration-check.sql) | SQL assertions after Playwright submit |
| [`scripts/r1/reset-uat-test-household.sh`](../scripts/r1/reset-uat-test-household.sh) | Clear Fall 2026 data for manifest test household (before UAT smoke) |
| [`docs/R1_UAT_SMOKE.md`](../docs/R1_UAT_SMOKE.md) | Thomas ~10 min UAT checklist (Preview) |
| `e2e/r1/*.spec.ts` | Human-use Playwright coverage (24 tests) |
| [`scripts/db/prod-registration-inventory.sql`](../scripts/db/prod-registration-inventory.sql) | Read-only prod stats |
| [`scripts/db/snapshot_uat.sh`](../scripts/db/snapshot_uat.sh) | Backup UAT before destructive tests |
| [`.claude/skills/e2e/SKILL.md`](../.claude/skills/e2e/SKILL.md) | Local Playwright runner |

---

*Last updated: 29 August 2026*
