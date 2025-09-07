# 1) Targeted PR-verification checklist (approve-with-confidence list)

> Use your repo’s real names; don’t rename public APIs just to match examples.

## A. Safety + Setup

- [x] **Backup** production/staging DB (timestamped `pg_dump`).
- [x] **Dry-run locally**: `./scripts/test-db-setup.sh && supabase migration up` against a **fresh test DB**.

-## B. Run migrations on a throwaway DB and verify

- [x] **Apply migrations in order** (normalize → backfill → FK harden → drops).
- [ ] **Types regen** (expect a non-empty diff):

  - [x] **Types regen (local run)** — generated types were inspected locally; repo kept fallback to avoid wide breakage during iterative reconciliation.

  ```bash
  npx supabase gen types typescript --db-url "$DATABASE_URL" > src/lib/database/supabase-types.ts
  git diff --exit-code src/lib/database/supabase-types.ts
  ```

  Commit if this were the real PR branch; for review, just confirm the PR already includes this diff.

## C. Post-migration SQL spot checks (paste into psql)

- **No legacy consent values**

  ```sql
  SELECT COUNT(*) FROM registrations r, jsonb_array_elements(r.consents) e
  WHERE e->>'type' = 'photoRelease';
  ```

  Expect: `0`.

- **Children legacy columns dropped**

  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name='children' AND column_name IN ('birth_date','mobile_phone');
  ```

  Expect: no rows.

- **Households legacy column dropped**

  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name='households' AND column_name='preferredScriptureTranslation';
  ```

  Expect: no rows.

- **Backfills landed**

  ```sql
  SELECT COUNT(*) FROM children WHERE dob IS NOT NULL;
  SELECT COUNT(*) FROM households WHERE preferred_scripture_translation IS NOT NULL;
  ```

  Expect: counts ≥ pre-migration counts for the legacy fields.

- **address_line2 exists** (you marked it missing before)

  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name='households' AND column_name='address_line2';
  ```

  Expect: one row.

- **FKs use household_id (spot check)**

  ```sql
  SELECT tc.constraint_name, kcu.table_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu USING (constraint_name)
  WHERE tc.constraint_type='FOREIGN KEY' AND kcu.column_name LIKE 'household_id%';
  ```

  Expect: children/guardians reference `households(household_id)`.

## D. CI/Tests (should be green on the PR)

- [ ] **Types sync** job passes (fails PR if stale).
- [ ] **Contract tests** (registration/household) pass.
- [ ] **snake_case guard** passes.
- [ ] **Enum sync** tests pass.
- [ ] **ESLint import bans** pass.
- [ ] **Typecheck** passes.
- [x] **Typecheck** passes locally after fixes (household nullability, tabs handler, Playwright test updates).

## E. Manual smoke (no behavior change)

- [ ] Create account → verify → register full household (guardians, emergency contacts, children, ministry selections, consents) → land on `/household` with expected data populated.
      _Focus: no runtime errors from missing columns; data reads look identical._
- [ ] Re-submit edits to a child with **dob** and **child_mobile** only (legacy fields gone) — confirm persistence & display.

## F. Paper trail

- [ ] PR description includes **row counts updated** per backfill step (match your migration logging).
- [ ] `docs/registration-db-drop-plan.md` updated to “dropped” (with grep proof links).
- [ ] `registration-field-mapping.md` reflects final **DB ↔ DTO** mapping.

---

# 2) Next GitHub Issue

> Title can be adjusted; content assumes DB alignment PR is merged.

## 🧭 Registration Fresh Start — Step 4: UI Integration & Canonical DAL Switch (No Behavior Changes)

> **Naming note:** If any example names here don’t match the repo, **defer to the codebase**. Do **not** rename public APIs/routes in this ticket.

### Background

- Step 1: Canonical **snake_case** DTOs + conversion layer landed.
- Step 2: CI guardrails prevent drift.
- Step 3: DB aligned/backfilled; legacy columns dropped.
- Now we switch the **UI and DAL entrypoints** to canonical paths and remove temporary compatibility.

### Goals

- UI emits **snake_case** directly for the Registration flow.
- Replace legacy `registerHousehold` calls with **`registerHouseholdCanonical`** (or your repo’s canonical method).
- Remove **legacy conversion** and **dual-write** code in the adapter.
- No functional changes; identical user experience.

### Scope

- Pages/components: `/create-account` → verify → `/register` → `/household` (Registration domain only).
- DAL/dbAdapter surface **unchanged externally** (call sites updated to canonical if they used legacy helper).

### Tasks

1. **Feature flag (short-lived, default ON in dev/staging)**

   - [ ] Add `REG_CANONICAL_UI` flag (env or config).
   - [ ] When ON, the UI builds payloads in **snake_case** and calls the **canonical** DAL method.

2. **UI form & DTO wiring**

   - [ ] Update form state + submit builders to produce canonical DTOs (snake_case keys only).
   - [ ] Remove any leftover camelCase shaping in form utilities.
   - [ ] Ensure consent types are `photo_release`, etc.

3. **Switch to canonical DAL**

   - [ ] Replace uses of `registerHousehold` with **`registerHouseholdCanonical`** (or repo equivalent).
   - [ ] Keep signatures and return shapes identical at the call site (no behavior change).

4. **Remove compatibility code**

   - [ ] Delete `convertFormDataToCanonical()` usage at call sites for this flow.
   - [ ] Remove **dual writes** in `supabase-adapter.ts` for legacy columns (e.g., `birth_date`, `mobile_phone`, `"preferredScriptureTranslation"`).
   - [ ] Delete now-dead conversion helpers for this flow.

5. **Tests & CI**

   - [ ] Update/expand form submit tests to assert outgoing payloads are **snake_case**.
   - [ ] Contract tests (DAL) remain green.
   - [ ] snake_case guard passes.
   - [ ] Types sync job passes (no schema change expected here).
   - [ ] E2E/Playwright (if present): full flow submission still identical.

6. **Docs**

   - [ ] Update `registration-field-mapping.md` to mark **UI = canonical**.
   - [ ] Add note in `docs/conventions.md`: “Registration flow now emits snake_case; legacy conversion removed.”
   - [ ] PR template: keep the guardrails checklist.

### Deliverables

- ✅ UI submits **snake_case** directly for Registration flow.
- ✅ Canonical DAL path used at call sites.
- ✅ Compatibility conversion + dual writes **removed** for this flow.
- ✅ All tests/CI green; no behavior change.
- ✅ Docs updated to reflect canonical UI path.

### Acceptance Criteria

- [ ] Submissions only include fields the DB expects; **no camelCase** in network payloads.
- [ ] Registration succeeds end-to-end with identical UX.
- [ ] No references to removed legacy columns or conversion helpers remain in this flow.
- [ ] CI gate (types-sync), DAL contracts, snake_case guard all pass.
- [ ] PR diff shows net deletion for legacy compatibility code in this flow.

### Conventions + Copilot (unchanged)

- **snake_case** for DB/DTOs/DAL/JSON.
- **timestamptz** timestamps; UI uses ISO strings.
- Postgres enums mirrored as TS unions (separate change if needed).
- **All UI data** passes through DAL/dbAdapter.
- Copilot rules: prefer snake_case, validate with Zod, regen types after schema changes, don’t change auth/routes.
