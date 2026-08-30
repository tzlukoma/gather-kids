# Active Cycle Scoping Plan — Staff UI & Ops After Year Switch

**Status:** Planning (post-R1)  
**Trigger:** Fall 2026 activated on production; staff surfaces still show **all active children** and **all historical enrollments** as if nothing changed. R1 fixed **guardian registration routing** and **household profile cycle accordions**; it did **not** scope check-in, dashboard, rosters, registrations list, incidents, exports, or digest to the active registration cycle.  
**Canonical context:** [`docs/PRODUCT_SPEC.md`](./PRODUCT_SPEC.md), [`docs/R1_IMPLEMENTATION_PLAN.md`](./R1_IMPLEMENTATION_PLAN.md) (complete)  
**Related:** [GitHub #249](https://github.com/tzlukoma/gather-kids/issues/249) (prod validation before family email)

---

## Problem statement

After flipping `registration_cycles.is_active` to Fall 2026:

| Surface | Expected (operations) | Actual today |
|---------|----------------------|--------------|
| **Check-in** | Children **enrolled/registered for Fall 2026** | All `children.is_active = true` (includes Fall 2025-only kids) |
| **Dashboard** | Registration counts for **active cycle** | All active children; label hardcoded `Registrations (2025)` |
| **Rosters** | Default list = active-cycle enrollees | All active children unless ministry filter applied |
| **Registrations admin** | Default list = households with active-cycle registration | All households (admin view) |
| **Incidents** | Log/view focused on current enrollees | All-time incidents; child picker = checked-in today (any active child) |
| **Household profile** | ✅ Multi-cycle accordion (R1) | Correct — preserve this |
| **Daily digest** | New enrollments for **active cycle** | Any enrollment since checkpoint (any cycle) |

Historical data must **remain queryable** (prior cycle rosters, attendance by date, household profile accordions). The gap is **default operational scope**, not data deletion.

---

## Design principles

1. **Single resolver:** Always use `getCurrentRegistrationCycle()` / `requireActiveRegistrationCycle()` from `src/lib/dal/ministries.ts`. Remove inline `cycles.find(c => c.is_active)`.
2. **Operational vs archival:** Day-to-day staff UI defaults to **active cycle**. Historical read uses cycle picker or date range — never delete old rows.
3. **Child inclusion rule (pick one, document in code):**
   - **Recommended:** Child appears in operational UI if they have a **`registrations` row** for the cycle **OR** at least one **`ministry_enrollments` row** with `status = 'enrolled'` for the cycle.
   - Align with R1 routing (`householdHasActiveCycleRegistration` uses `registrations` only) — consider union for staff UI so partially migrated legacy rows still appear.
4. **Attendance & incidents:** No cycle column today. Phase 1 = filter by child set derived from cycle. Phase 2 (optional) = nullable `cycle_id` on new rows for analytics.
5. **Inactive children:** Never show on check-in/rosters unless explicitly toggled (“show inactive” admin-only).

---

## Current architecture (audit)

### Cycle-aware (partial)

| Area | Files | Behavior |
|------|-------|----------|
| Register / guardian routing | `households.ts`, `register/page.tsx` | Active cycle + prior cycle prefill ✅ |
| Household profile | `household-profile.tsx`, `getHouseholdProfile()` | All cycles in accordion; expand active ✅ |
| Rosters ministry filter | `rosters/page.tsx`, `queryHouseholdList()` | Filters by active-cycle `ministry_enrollments` only when ministry selected |
| Registrations list (leader) | `registrations/page.tsx`, `queryHouseholdList(ministryIds)` | Same as above |

### Not cycle-scoped

| Area | Key entry | Current query |
|------|-----------|---------------|
| Check-in | `getAllChildren()` → `listChildren({ isActive: true })` | All active children |
| Dashboard stats | `getRegistrationStats()` | Active children / households |
| Dashboard check-in ratio | `getCheckedInCount()` / total active children | All active children |
| Rosters default | `useChildren()` | All active children |
| Registrations admin list | `queryHouseholdList()` no filter | All households, all children |
| Incidents | `getIncidentsForUser()`, `listIncidents()` | All time |
| Attendance | `listAttendance({ date })` | By date only |
| Exports | `exportRosterCSV`, `exportAttendanceRollupCSV` | Inherits page / date range |
| Daily digest | `scripts/dailyDigest.js` | New enrollments since checkpoint, any cycle |

### Schema notes

- **`registrations`**, **`ministry_enrollments`**, **`leader_assignments`**, **`child_year_profiles`**: have `cycle_id`.
- **`attendance`**, **`incidents`**: no `cycle_id` (link via `child_id` + date).

---

## Target behavior by surface

### 1. Admin dashboard (`/admin-overview`)

**Files:** `admin-overview/page.tsx`, `dal/dashboard.ts`, `hooks/data/dashboard.ts`

| Metric | Target |
|--------|--------|
| Registration card | Households / children with active-cycle registration (or enrollment union) |
| Label | Dynamic: `Registrations (Fall 2026)` from active cycle name |
| Checked-in card | Numerator: today’s open attendance. Denominator: active-cycle enrollees (not all active children) |
| Incidents card | Keep all unacknowledged (safety); optional subtitle “all time” |

**Acceptance:** After cycle flip, registration count drops until families re-register; checked-in ratio denominator matches check-in list size.

---

### 2. Check-in (`/check-in`)

**Files:** `check-in/page.tsx`, `check-in-view.tsx`, `dal/children.ts`, `hooks/data/children.ts`

| Item | Target |
|------|--------|
| Child list | `getChildrenForActiveCycle()` instead of `getAllChildren()` |
| Check-in action | Unchanged — still writes `attendance` by date |
| Historical attendance | Reports/exports by date range — include all past check-ins |

**Edge cases:**

- Child checked in last year but not registered for 2026 → **hidden** from list (expected).
- Guest / one-off visitor → out of scope unless product adds guest check-in later.

**Acceptance:** Fall 2025-only active children do not appear after flip; Fall 2026 registered children do.

---

### 3. Rosters (`/rosters`)

**Files:** `rosters/page.tsx`, `dal/children.ts` (`getChildrenForLeader`), `dal/exports.ts`

| Item | Target |
|------|--------|
| Default child set | Active-cycle enrollees (all ministries) |
| Ministry filter | Intersect with leader ministries + selected ministry |
| Wire `getChildrenForLeader()` | Remove dead import; use for ministry-leader role |
| Cycle selector (phase 2) | Dropdown: active cycle default, prior cycles for archive export |
| Copy | Replace “all children registered” with cycle name |

**Acceptance:** “All Ministries” shows only Fall 2026 enrollees; prior-cycle CSV available via cycle picker.

---

### 4. Registrations admin (`/registrations`)

**Files:** `registrations/page.tsx`, `households.ts` (`queryHouseholdList`)

| Item | Target |
|------|--------|
| Default list | Households where `householdHasActiveCycleRegistration()` OR enrollment union |
| Detail page | **No change** — keep multi-cycle accordion |
| Admin toggle (phase 2) | “Show all households” / “Active cycle only” |

**Acceptance:** List count aligns with families still needing Fall 2026 registration; profile still shows Fall 2025 history.

---

### 5. Incidents (`/incidents`, check-in chips)

**Files:** `incidents/page.tsx`, `incident-form.tsx`, `dal/attendance.ts`

| Item | Target |
|------|--------|
| Default view | Filter to incidents for children in active-cycle set (client or DAL join) |
| Log form child picker | Align with cycle-scoped check-in list |
| Historical | “All cycles” / date range toggle |
| Phase 2 migration | Optional `incidents.cycle_id` set at log time |

**Acceptance:** Old incidents remain visible in historical mode; new logs only offer current-cycle children.

---

### 6. Reports & exports

**Files:** `reports/page.tsx`, `dal/exports.ts`, rosters export

| Export | Target |
|--------|--------|
| Roster CSV | Cycle-scoped child set; filename includes cycle name |
| Attendance rollup | Date range (unchanged); optional filter to cycle enrollees in range |
| Emergency snapshot | Reimplement for Supabase (deprecated Dexie path broken) with cycle scope |

---

### 7. Daily digest

**Files:** `scripts/dailyDigest.js`, `.github/workflows` digest job

| Item | Target |
|------|--------|
| New enrollments query | `.eq('cycle_id', activeCycleId)` |
| Backfill noise | Avoid alerting on legacy cycle backfills |

---

## Implementation phases

### Phase 0 — Decisions (Thomas, ~30 min)

- [ ] Confirm **inclusion rule**: registrations only vs registrations ∪ enrollments for staff UI.
- [ ] Confirm check-in behavior for children registered but not yet enrolled in a ministry.
- [ ] Confirm incidents default: all-time unacknowledged on dashboard vs cycle-filtered.

Record in `.r1-local/manifest.json` `decisions` or issue comment.

---

### Phase 1 — DAL foundation (Agent)

**New helpers** in `src/lib/dal/` (e.g. `cycle-scoping.ts` or extend `ministries.ts` + `children.ts`):

```ts
getActiveRegistrationCycleOrThrow()
getChildIdsForCycle(cycleId, mode: 'registration' | 'enrollment' | 'union')
getChildrenForCycle(cycleId, mode?)
householdIdsForCycle(cycleId)
getRegistrationStatsForCycle(cycleId)
```

**Tasks:**

- [ ] Centralize active cycle resolution; grep-remove inline `is_active` finds.
- [ ] Unit tests for inclusion rules (mirror `registration-cycles.test.ts` style).
- [ ] Document mode in `dal/README.md`.

**Done when:** Helpers tested; no UI changes yet.

---

### Phase 2 — Operational UI (Agent)

| Workstream | Priority | Effort |
|------------|----------|--------|
| Check-in child list | P0 | S |
| Dashboard stats + label | P0 | S |
| Rosters default list | P0 | M |
| Registrations admin list default | P1 | M |
| Incidents default filter | P1 | M |
| Daily digest cycle filter | P1 | S |

**Done when:** Manual prod/UAT checklist passes (see below).

---

### Phase 3 — Historical read & exports (Agent)

- [ ] Cycle selector component (shared) for rosters, registrations list, incident archive.
- [ ] Export filenames + filtered data.
- [ ] Reimplement emergency snapshot export on Supabase.

---

### Phase 4 — Optional schema (Agent + Thomas DB deploy)

- [ ] Migration: nullable `cycle_id` on `attendance`, `incidents`.
- [ ] Set on insert from active cycle.
- [ ] Backfill script (best-effort from enrollment at check-in date).

---

## Test plan

### Unit / Jest

- `getChildIdsForCycle` with registrations-only, enrollments-only, union.
- `getRegistrationStatsForCycle` household/child counts.

### Manual (UAT or prod after deploy)

| # | Step | Expected |
|---|------|----------|
| 1 | Flip active cycle to Fall 2026 | — |
| 2 | Open `/check-in` | No Fall 2025-only children (who lack 2026 reg/enrollment) |
| 3 | Dashboard registration card | Label shows Fall 2026; count matches registered households |
| 4 | `/rosters` all ministries | Same child set as check-in |
| 5 | `/registrations` | Lists households missing or having Fall 2026 registration |
| 6 | Household profile for returning family | Fall 2025 accordion still visible (collapsed) |
| 7 | Attendance report date range Nov 2025 | Still shows historical check-ins |
| 8 | Cycle selector (phase 3) | Fall 2025 roster export matches last year |

### Playwright (new `e2e/cycle-scoping/`)

- Seed UAT: two cycles, child enrolled only in prior cycle → not on check-in after flip.
- Child registered in active cycle → appears on check-in.

---

## File checklist (agent touch list)

| File | Change |
|------|--------|
| `src/lib/dal/children.ts` | `getChildrenForCycle`, refactor `getChildrenForLeader` |
| `src/lib/dal/dashboard.ts` | Cycle-scoped stats |
| `src/lib/dal/households.ts` | `queryHouseholdList` default cycle filter |
| `src/lib/dal/ministries.ts` | Export shared resolver usage |
| `src/app/(admin)/check-in/page.tsx` | Use cycle-scoped hook |
| `src/app/(admin)/admin-overview/page.tsx` | Dynamic cycle label |
| `src/app/(admin)/rosters/page.tsx` | Default cycle scope + wire leader helper |
| `src/app/(admin)/registrations/page.tsx` | Default cycle filter |
| `src/app/(admin)/incidents/page.tsx` | Cycle filter + toggle |
| `scripts/dailyDigest.js` | Filter by active cycle |
| `src/lib/dal/exports.ts` | Cycle-aware exports |
| `docs/PRODUCT_SPEC.md` | Mark cycle scoping shipped (when done) |

---

## Out of scope

- Deleting or archiving old cycle rows.
- Bible Bee cycle coupling (separate table; note in issue if overlap).
- RLS / multi-tenant security (PRODUCT_SPEC R2).
- Guest check-in without registration.

---

## Definition of done

- [ ] Active cycle is the **default scope** for check-in, dashboard registration metrics, rosters, and registrations admin list.
- [ ] Prior-cycle data remains visible on household profile and via historical selectors / date-based reports.
- [ ] Dashboard label is not hardcoded to a year.
- [ ] Daily digest only reports active-cycle enrollments.
- [ ] Tests + manual checklist green on UAT.
- [ ] Deployed to production before or immediately after mass registration email (coordinate with #249).

---

## References

- R1 cycle utils: `src/lib/dal/registration-cycle-utils.ts`
- Deprecated cycle-aware Dexie metrics (reference): `queryDashboardMetrics(cycleId)` in `src/lib/dal.ts`
- Prod cycle IDs: Fall 2025 `e3a387b5-de59-4e37-a52a-b9e9102dc45c`, Fall 2026 `ed51cc85-55b8-4c2b-b31e-016771bd9456` (prod)

*Last updated: 30 August 2026*
