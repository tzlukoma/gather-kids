# gatherKids Product Spec

**Status:** Canonical product description as of 29 August 2026  
**App version:** 1.7.0 (`develop`)  
**Production snapshot:** 56 real families, 99 children, one registration cycle (`Fall 2025`)

This document replaces `docs/FEATURES.md` and `docs/blueprint.md` as the source of truth for *what the product is* and *what we will build next*. Those older files are kept as historical design notes; they conflict with each other and with production.

---

## 1. What the product is

gatherKids is a web app Thomas built for **Youth Ministry at Cathedral International**. Staff use it on phones and laptops during Sunday School. Parents use it to register children for Sunday School and other youth programs (Bible Bee, choirs, Khalfani, Nailah, and the rest of the ministry list).

It is in **active use for check-in**. Registration last ran as **Fall 2025** (14 Sep 2025–30 Jun 2026). The next product slice is Fall 2026 returning-family registration.

**Stack (as shipped):** Next.js 15 / React 18, Supabase Auth + Postgres, TanStack Query, React Hook Form + Zod. Hosted on Vercel. UAT and production are separate Supabase projects. Demo/IndexedDB mode is removed from the runtime (leftover files remain).

---

## 2. Personas (as the app actually works)

| Persona | How they get in | Where they land | What they do |
|---------|-----------------|-----------------|--------------|
| **Guardian / parent** | Magic link or email+password. Role `GUARDIAN`, household via `user_households`. | `/household` | See family, edit household/children (partial), Bible Bee progress if enrolled, photos. |
| **Ministry leader** | Email+password (or magic link). Role `MINISTRY_LEADER`, scoped by ministry account / group email. | `/check-in` or `/rosters` | Check in/out, rosters, incidents for assigned ministries. |
| **Administrator** | Same auth. Role `ADMIN` stored in `user_metadata` (not server-owned — see roadmap). | `/admin-overview` | Users, ministries, leaders, registrations, branding, reports, Bible Bee admin, cycles. |
| **Bible Bee evaluator** | Typically admin/leader. | `/evaluation-scriptures` | Read scriptures for evaluation. |
| **Unauthenticated visitor** | Public site. | `/` | Register or log in. |

There is no separate “ministry admin” login product. Ministry leaders and church admins share the staff UI; access is supposed to be role- and ministry-scoped in the client. The database does **not** yet enforce that (almost no RLS).

---

## 3. Implemented features

Honest status: **shipped** = used in production; **partial** = UI/code exists but is incomplete, unsafe, or unused; **ops** = works for Thomas, not a parent-facing feature.

### 3.1 Public site and branding — shipped

- Home page with organization name, tagline, Register / Login, optional YouTube/Instagram.
- Admin branding settings: app name, logo upload, “logo only”, description, social links. Persisted in `branding_settings`.
- Mobile-first layout (Radix + Tailwind). Check-in is designed for phone + laptop at the door.

### 3.2 Authentication — shipped, with gaps

**Shipped**

- Supabase Auth: magic link (PKCE) and email/password.
- Create account, forgot/reset password, password visibility toggle.
- Onboarding to set a password after first magic-link sign-in.
- Role-based post-login routing (admin/leader → staff routes; guardian → `/household`).
- Feature flags: magic link, password, Google (Google is **not** enabled).
- Auth callback with timeouts/fallbacks for preview deployments.

**Partial / known bugs**

- Roles live in **client-writable** `user_metadata` ([#184](https://github.com/tzlukoma/gather-kids/issues/184)).
- Guardian onboarding still hard-redirects to `/dashboard` ([#187](https://github.com/tzlukoma/gather-kids/issues/187)); `/dashboard` then redirects to `/check-in`.
- `/api/households/[id]/user` can rebind households with the service role and **no auth** ([#183](https://github.com/tzlukoma/gather-kids/issues/183)).
- Unauthenticated users can still submit `/register` and create orphaned rows ([#185](https://github.com/tzlukoma/gather-kids/issues/185)). In production this did not happen for the 56 real families (all are auth-linked).

### 3.3 Family registration — shipped once; returning year is not

**Shipped (Fall 2025)**

- Parent form: household address, multiple guardians, emergency contact, multiple children (DOB, grade, allergies, special needs, phone), ministry enroll vs interest, auto Sunday School enrollment, liability + photo-release consents, choir age bands, custom ministry questions.
- Draft persistence (`form_drafts`, feature-flagged).
- Phone formatting.
- Admin list of registrations with search; household detail.
- Registration cycles table (`registration_cycles`). Production has **one** cycle: `Fall 2025` / `e3a387b5-de59-4e37-a52a-b9e9102dc45c` (still `is_active`).
- 98 child registrations, 354 ministry enrollments, all submitted via `web`.
- Daily digest emails to ministry contacts and admins when enrollments change (GitHub Action + Mailjet).

**Partial — this is the Fall 2026 work**

- Prefill UI and `findHouseholdByEmail` exist, but:
  - Known emails dump household PII **without** sending a magic link.
  - Security-question backup is a **mock** (hardcoded answers).
  - Prior cycle is computed as `parseInt(cycle_id) - 1`. Production cycle IDs are **UUIDs**, so this cannot find last year.
  - Code falls back to cycle id `'2025'`, which is not a production cycle.
  - `isPrefill` on submit skips creating new children, deactivating removed children, and linking `user_households`.
  - Consents on file are not a JSON array; the form must not treat last year as already signed.
- Grade values in prod are mixed (`3`, `3rd`, `K`, `-1`, `PreK-4`, `Kindergarten`).
- 15 empty household shells (no kids, no guardians) sit in the table; lookup must ignore them.
- 2 guardian emails are attached to more than one household; 3 emails use typo domains.

### 3.4 Parent / household portal — shipped

- `/household`: household profile, children, enrollments.
- Edit household address, guardians, emergency contact, child enrollments (admin/parent UIs exist; returning *annual* re-register is still the `/register` form).
- Child detail; child photos (43 avatars in prod; crop/camera work is incomplete — [#146](https://github.com/tzlukoma/gather-kids/issues/146)).
- Bible Bee section only when a child is enrolled: scriptures, progress, essay status, translation preference.
- Account/security under household profile / settings.

### 3.5 Check-in / check-out — shipped (the live product)

- `/check-in`: search by child or family name, filter by grade, show photo, allergies/special needs, one-tap check-in.
- Check-out: last 4 of an authorized phone **or** household PIN; admin override with pickup name/note.
- Live headcount of children currently checked in.
- 503 attendance rows in prod (28 Sep 2025–7 Jun 2026).
- Adapter has a Supabase Realtime `subscribeToTable` helper; check-in UX is optimistic via React Query, not a proven multi-device subscription product.

### 3.6 Rosters — shipped

- `/rosters`: ministry-scoped lists of enrolled children, grade filter, search, export (CSV improvements shipped in 1.4.x).

### 3.7 Incidents — shipped

- Leaders log incidents (description, severity) for children they can see.
- Admin list with acknowledge-before-close.
- Dashboard shows unacknowledged incidents.

### 3.8 Ministries and leaders — shipped

- CRUD ministries: enrolled vs expressed-interest, min/max age (used for choirs), custom questions, open/close, active flag.
- Production ministries include Sunday School, Bible Bee, choirs (Joy Bells / Keita / Teen), Khalfani, Nailah, dance, acolyte, ushers, media, musical, VBS, orators, nursery, college tour, confirmation, orchestra; two inactive (international travel, teen fellowship).
- Leader profiles independent of login; directory; assign to ministries (PRIMARY/VOLUNTEER); background-check flag.
- Ministry accounts and **ministry groups** (group email RBAC).
- User management (create users, assign roles) from admin settings.

### 3.9 Bible Bee — shipped

- Admin: cycles/years, divisions, grade rules, scriptures (multi-translation), essay prompts, enrollments, manual division override.
- Auto-enroll from registration when Bible Bee is selected; 28 enrollments in Fall 2025.
- Parent progress view; evaluator scriptures page.
- Household guardian view with date gating.

### 3.10 Reporting — shipped (narrow)

- Admin `/reports`: emergency snapshot CSV (today’s roster + allergies/contacts), attendance rollup CSV by date range.
- Dashboard: checked-in count, household/child registration counts, pending incidents.
- **Not shipped** from the original blueprint: missing-consent count, choir eligibility warnings as dashboard metrics.

### 3.11 Operations — shipped for the operator

- UAT vs production Supabase projects; Vercel; GitHub Actions deploy and daily digest.
- Health endpoint, Sentry, Web Vitals, Vercel Analytics.
- Keepalive workflow so the free-tier DB does not pause.
- Seed scripts for UAT/dev (not for prod family data).
- Debug panel (non-production).

### 3.12 What is in the repo but should not be treated as product

- `/dev-scriptures` — unauthenticated, uses service role. Lock or delete.
- `/avatar-demo` — leftover.
- IndexedDB adapter and demo-user paths — leftover from demo mode (cleanup tracked in [#266](https://github.com/tzlukoma/gather-kids/issues/266)).
- Google sign-in flag — off.

---

## 4. Conflicting specs (and what to ignore)

| Source | What it claims | Reality |
|--------|----------------|---------|
| **Notion** (GatherKids App + background brief, Mar–Apr 2026) | Maintenance phase. Primary purpose = check-in. Registration implied, not specified. | Check-in *is* the live use. Registration must be reopened for Fall 2026. |
| **`docs/blueprint.md`** (original) | Magic link + security-question backup. Prefill last year. Realtime rosters. Dashboard: missing consents + choir warnings. Prefill on re-register. | Security questions are mock. Prefill is broken against UUID cycles. Realtime is an adapter helper, not the check-in UX. Dashboard metrics are thinner. |
| **`docs/FEATURES.md`** | IndexedDB demo app, public unauthenticated registration (US-2.6), demo accounts, checkmarks on nearly every story. | Runtime is Supabase-only. US-2.6 is the *bug* we need to close (#185). Checkmarks overstate year-over-year registration and RLS. |
| **GitHub [#42](https://github.com/tzlukoma/gather-kids/issues/42) / PR 43** | `household.email` unique; `registrations.payload` JSONB; magic link → `/auth/magic-link`; demo mode. | Email is on **guardians**. Registrations are **per child**, cycle UUID, consents JSON. Callback is `/auth/callback`. Demo mode is gone. |
| **GitHub [#141](https://github.com/tzlukoma/gather-kids/issues/141)** (persona planning) | MVP = register + digest + login. Post-MVP = check-in, rosters, incidents, branding, Bible Bee admin. | Those “post-MVP” items **shipped**. The remaining parent gap is **re-registration with prefilled data** (explicitly listed as post-MVP there). |

**Canonical data model (production):**

- `households` (id is text `household_id`; address fields; scripture translation; **no** household email/phone in use — those live on guardians).
- `guardians.email` is the match key (100/101 filled).
- `children` belong to a household; `is_active`; grade is a free string.
- `registrations` per child + `cycle_id` UUID; `ministry_enrollments` per child + ministry + cycle.
- `user_households` links `auth.users` to a household (56/56 real families).
- `registration_cycles.cycle_id` is a **UUID**, not `'2025'`.

---

## 5. Roadmap

Ordered by what unblocks Fall 2026, then safety, then quality. GitHub numbers in parentheses are the existing issues this bucket covers.

### R1 — Returning-family registration (Fall 2026) — **next**

**Prerequisite:** [`docs/CI_CD_CLEANUP_PLAN.md`](./CI_CD_CLEANUP_PLAN.md)  
**Execution runbook:** [`docs/R1_IMPLEMENTATION_PLAN.md`](./R1_IMPLEMENTATION_PLAN.md)

**Goal:** The 56 families from Fall 2025 can sign in, see last year’s children, add/remove kids, change ministries and consents, and land in `/household` enrolled in a new cycle.

1. **Cycle ops:** Insert `Fall 2026` with a new UUID. Set Fall 2025 `e3a387b5-…` `is_active = false`. Keep 2025 rows for prefill. Remove every `cycle_id \|\| '2025'` fallback. Prior cycle = previous `registration_cycles` row, never `parseInt(id) - 1`.
2. **Login-first load:** After session, household comes from `user_households` (covers all 56). Ignore the 15 empty shells. Email lookup is backup only (new family, or the 2 shared emails), and **only after** a verified session. Never `listGuardians('')`.
3. **Submit semantics:** Split “source = prior cycle” from “mode = submit”. Submit always upserts household, creates new children, deactivates removed ones, writes **this** cycle’s registrations/enrollments, re-collects consents. Do not skip `user_households` because `isPrefill` is true (those 56 are already linked; new children still fail today via `updateChild` on a fresh UUID).
4. **Grade bump:** Canonicalize grades (PreK / K / 0–12). Prompt parents to confirm this year’s grade. Re-place choir by age (4–8 / 9–12 / 13–18), do not copy last year’s choir row blindly.
5. **Fixes that ride along:** [#185](https://github.com/tzlukoma/gather-kids/issues/185) auth required to submit; [#187](https://github.com/tzlukoma/gather-kids/issues/187) guardian onboarding → `/household`; [#42](https://github.com/tzlukoma/gather-kids/issues/42) / [#43](https://github.com/tzlukoma/gather-kids/pull/43) magic-link branch — **reimplement on `develop`**, do not revive the 2025 branch.
6. **Prove it:** Playwright on a UAT copy of the 56: login → prefill → add one child, remove one, bump grade, change ministries → `/household` shows Fall 2026 enrollments. ([#34](https://github.com/tzlukoma/gather-kids/issues/34) main-flow tests.)

### R2 — Security gates (ship with or immediately after R1)

Do not email every family a registration link until these are done. They are already filed.

- Auth on `/api/households/[householdId]/user` ([#183](https://github.com/tzlukoma/gather-kids/issues/183)).
- Stop trusting client-writable `user_metadata.role`; move roles to `app_metadata` or a server table ([#184](https://github.com/tzlukoma/gather-kids/issues/184)).
- RLS Phase 1: deny anon on PII tables; authenticated leaders can still `SELECT` operational data until the DAL is scoped ([#194](https://github.com/tzlukoma/gather-kids/issues/194)). Guardians must not `SELECT` all guardians.
- Lock/delete `/dev-scriptures`. Rotate any shared staff password stored in training notes. Stop echoing Mailjet secrets in digest CI logs.

### R3 — Parent and staff polish (planned, not blocking R1)

- **Photos:** square crop, camera, guardian vs admin access, persist `children.photo_url` / avatars ([#146](https://github.com/tzlukoma/gather-kids/issues/146); related work closed in [#147](https://github.com/tzlukoma/gather-kids/issues/147) but this ticket is still open).
- **Notifications:** confirmation and incident emails to parents were post-MVP in [#141](https://github.com/tzlukoma/gather-kids/issues/141). Daily *staff* digest exists; parent-facing mail does not.
- Dashboard metrics from the blueprint: missing consents, choir eligibility warnings.
- Real multi-device roster subscriptions (adapter helper exists; not the product).

### R4 — Quality and tests

- Playwright for login → check-in → roster ([#34](https://github.com/tzlukoma/gather-kids/issues/34); noted as missing in `docs/testing.md`).
- Admin user-management e2e ([#190](https://github.com/tzlukoma/gather-kids/issues/190)).
- MailHog in CI for magic-link tests ([#100](https://github.com/tzlukoma/gather-kids/issues/100); local email tests exist).
- Deterministic test seeds ([#102](https://github.com/tzlukoma/gather-kids/issues/102)).

### R5 — Platform health (do not mix into the registration PR)

- Leftover demo-mode / IndexedDB cleanup ([#266](https://github.com/tzlukoma/gather-kids/issues/266); supersedes [#191](https://github.com/tzlukoma/gather-kids/issues/191)).
- Data-layer leftovers: dual `registerHousehold` writers, `useBibleBee` demo DAL ([#199](https://github.com/tzlukoma/gather-kids/issues/199), [#151](https://github.com/tzlukoma/gather-kids/issues/151), [#152](https://github.com/tzlukoma/gather-kids/issues/152), [#189](https://github.com/tzlukoma/gather-kids/issues/189)).
- Snake_case shape audit ([#108](https://github.com/tzlukoma/gather-kids/issues/108)).
- Restore `no-explicit-any` as error ([#126](https://github.com/tzlukoma/gather-kids/issues/126), [#197](https://github.com/tzlukoma/gather-kids/issues/197)).
- Component empty states / skeletons leftovers ([#200](https://github.com/tzlukoma/gather-kids/issues/200)).
- Onboarding tech-debt cleanup ([#186](https://github.com/tzlukoma/gather-kids/issues/186)).
- Docs: CI/CD writeup ([#192](https://github.com/tzlukoma/gather-kids/issues/192) / [#193](https://github.com/tzlukoma/gather-kids/issues/193)), user-flow docs ([#180](https://github.com/tzlukoma/gather-kids/issues/180)), SQL column name in registration docs ([#181](https://github.com/tzlukoma/gather-kids/issues/181)).
- Tiny: unused imports ([#153](https://github.com/tzlukoma/gather-kids/issues/153)).

### R6 — Explicitly later / do not do for Fall 2026

- Dependabot majors: Next 16, Zod 4, eslint-config-next 16, React Query devtools 5.
- Weekly scripture push notifications ([#26](https://github.com/tzlukoma/gather-kids/issues/26) was closed; no push stack in the app). Revisit only if parents ask.
- Google OAuth.
- White-label as a second tenant (branding is single-org today).
- RLS Phase 2 (ministry-leader row filters) until list queries are server-scoped.

---

## 6. Suggested working sequence

```
CI/CD cleanup (docs/CI_CD_CLEANUP_PLAN.md)
        → R1 cycle + login-first prefill + submit fix
        → R2 #183 + #184 (before blasting a registration email)
        → R1 e2e on UAT copy of 56 families
        → open Fall 2026 registration
        → R3 photos / parent mail as follow-ups
        → R4–R5 as capacity allows
```

---

## 7. Sources

- Production inventory (SQL in `scripts/db/prod-registration-inventory.sql`), 29 Aug 2026.
- Application routes under `src/app/`, DAL under `src/lib/dal/`.
- GitHub issues (open feature/security/debt tickets listed above).
- Historical: `docs/blueprint.md`, `docs/FEATURES.md`, Notion GatherKids brief, [#141](https://github.com/tzlukoma/gather-kids/issues/141), [#42](https://github.com/tzlukoma/gather-kids/issues/42).
