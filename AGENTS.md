# gatherKids agent contract

This is the canonical, tool-neutral operating contract for coding agents working in this repository.

Tool-specific files (Cursor, Claude Code, Codex, GitHub Copilot) must point here. They may add tool mechanics. They must not copy this contract or override safety, environment, or escalation rules.

Human workflow: [`docs/AGENT_WORKFLOW.md`](docs/AGENT_WORKFLOW.md)
Procedures: [`.agents/skills/`](.agents/skills/)

## Product and architecture

gatherKids is a children's ministry management app for Youth Ministry at Cathedral International. Staff use it for check-in, rosters, incidents, and admin. Guardians use it to register children.

**Stack (as shipped):** Next.js 16, React 18, TypeScript, Supabase Auth + Postgres, TanStack Query, React Hook Form + Zod. Hosted on Vercel. UAT and production are separate Supabase projects.

Runtime data access is Supabase through the DAL (`src/lib/database/`). Demo/IndexedDB mode is **not** a supported runtime. Leftover Dexie files exist; do not treat them as the current architecture.

Canonical product description: [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md). Prefer it over older files such as `docs/FEATURES.md` and `docs/blueprint.md`.

## Repository map

| Area | Location |
|------|----------|
| App router, API routes | `src/app/` |
| UI components | `src/components/` |
| Auth, DAL, validation | `src/lib/` |
| React Query hooks | `src/hooks/` |
| Jest tests | `__tests__/`, co-located `*.test.ts(x)` |
| Playwright | `e2e/`, `tests/playwright/`, `e2e.config.ts` |
| SQL migrations | `supabase/migrations/` |
| Generated DB types | `src/lib/database/supabase-types.ts` |
| Seed / DB / ops scripts | `scripts/` |
| CI workflows | `.github/workflows/` |
| Operational docs | `docs/`, especially [`docs/CI_CD.md`](docs/CI_CD.md) |
| User-facing docs | `content/help/` (in-app `/help`) |
| This contract’s procedures | `.agents/skills/` |

## Decision hierarchy

Resolve ordinary discrepancies in this order. Do not stop for routine conflicts.

1. Security, privacy, and environment-safety rules in this file.
2. Explicit acceptance criteria and constraints in the assigned issue.
3. Executable repository truth: source, `package.json`, tests, CI workflows.
4. Current architecture, product, and operational documentation (prefer `docs/PRODUCT_SPEC.md` and `docs/CI_CD.md`).
5. Reusable [`.agents/skills/`](.agents/skills/) procedures.
6. Tool-specific Cursor, Claude, Codex, or Copilot guidance.
7. Historical plans, comments, and examples.

If lower-priority guidance conflicts with executable behaviour, follow the executable behaviour, record the discrepancy in the PR, and update stale docs when that is safely in scope.

Escalate only when the discrepancy affects product behaviour, data interpretation, security, permissions, production operations, architecture, or issue scope.

## GitHub is the control plane

Do not require Thomas to monitor Cursor, Claude, Codex, or Copilot dashboards.

Shared system of record:

- Repo: `tzlukoma/gather-kids`
- Project: [gatherKids Roadmap](https://github.com/users/tzlukoma/projects/7)
- Inbox views:
  - [Needs My Input](https://github.com/users/tzlukoma/projects/7/views/5) (`Status: Needs Thomas`)
  - [Ready to Review](https://github.com/users/tzlukoma/projects/7/views/6) (`Status: PR Review`)
  - [Agent Working](https://github.com/users/tzlukoma/projects/7/views/7)

Thomas’s two primary queues are **Needs My Input** and **Ready to Review**.

## Issue-to-PR workflow

1. Confirm the issue is still valid against latest `main`.
2. Work on a separate branch (`feature/*`, `fix/*`, `chore/*`, `docs/*`, `ci/*`).
3. Set Project **Agent** (Cursor, Copilot, Codex, Claude, or Human) and **Risk** when permitted. Apply `agent:managed`.
4. Move the issue to **Agent Working**.
5. Implement only what the issue asks for.
6. Verify with the commands mapped in [`.agents/skills/verify-change/SKILL.md`](.agents/skills/verify-change/SKILL.md).
7. Open a **draft** pull request with the evidence checklist. Do not mark it ready for review yourself.
8. Apply `agent:review-ready`, request `@tzlukoma` as reviewer, move the **issue** to **PR Review**.
9. Stop. Do not merge, deploy, or mark the work **Done**.

Opening a PR currently adds the *PR* to the Roadmap at **PR Review** via [`.github/workflows/add-pr-to-project.yml`](.github/workflows/add-pr-to-project.yml). Keep the *issue* in **Agent Working** until the evidence checklist is complete.

Commits and PR titles must use [Conventional Commits](docs/CONTRIBUTING.md).

## Autonomy versus escalation

### Proceed without asking when

- Several approaches exist and one clearly matches current repository patterns.
- The choice is reversible, local, and does not change product behaviour.
- A name, file layout, or helper can be inferred from neighbouring code.
- Docs are stale but code, tests, and CI establish the intended behaviour.
- A minor defect directly blocks the issue and can be fixed inside that scope.
- A test needs an obviously synthetic fixture.
- Lint, format, or type errors were caused by your own changes.
- You can choose the smallest, least risky implementation and document it in the PR.

Do not escalate merely to transfer routine engineering judgment.

### Request human input when

- Acceptance criteria conflict with current product behaviour or architecture.
- A registration-cycle, enrolment, permissions, retention, or data-ownership rule is unresolved.
- The decision would materially change user-visible behaviour.
- The change would expand data access, privileges, or sensitive-data visibility.
- Production access, deployment, secrets, or credentials would be required.
- A destructive or difficult-to-reverse operation appears necessary.
- The ticket is already complete, materially stale, or superseded.
- The work is substantially larger than the issue suggests.
- The implementation would mix unrelated schema, authentication, UI, and operational changes.
- A significant pre-existing failure prevents safe verification.
- CI still fails after **two** focused repair attempts.
- Required external authority or a third-party account change is missing.

Procedure: [`.agents/skills/escalate-to-human/SKILL.md`](.agents/skills/escalate-to-human/SKILL.md).

## Scope and stop conditions

- One coherent issue per PR.
- Prefer a small, independently verifiable diff.
- If handwritten changes will exceed ~500 lines, touch unrelated areas, or mix schema, auth, UI, and operations, **stop** and propose sub-issues unless the original issue explicitly justifies that scope.
- Identify generated files and migrations separately from handwritten changes.
- No opportunistic refactors.
- At most **two** focused CI-repair attempts, then escalate.
- Continue independent portions of a ticket while blocked only when the pending decision cannot invalidate that work.
- Mentioning production behaviour in an issue does **not** authorise production operations.

## Development setup

Node **22.22.2+** (CI). App port **9002**, not 3000.

```bash
npm ci
npm run dev          # http://localhost:9002
```

Local env lives in `.env.local`. Use dummy or local-Supabase values only. Never commit secrets, `.env.local`, `.env.uat`, or real family data.

Local disposable database (optional, when the change needs it):

```bash
supabase start
npm run gen:types
npm run seed:dev
```

Do not invent npm scripts. Confirm every command against `package.json` or a workflow file.

## Canonical verification

Agents may run locally:

```bash
npm ci
npm run lint
npm run typecheck
npm test -- --passWithNoTests
npm run build
npm run docs:validate    # when /help content, changelog parser, or docs/HELP_DOCS.md change
npm run gen:types        # after local schema changes, from local Supabase
```

Playwright, when UI or E2E coverage is in scope:

```bash
npm run test:e2e:local   # requires .env.e2e.local and local services
```

Email/auth mail flows: `npm run test:email` only when those specs are in scope.

DAL/schema PRs also run the contract tests named in [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).

**CI on every PR** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): `lint`, `typecheck`, `test`, `build`, `db-fk` (apply `supabase/migrations/*.sql` to Postgres 15, `scripts/db/check_fks.sh`, `scripts/db/check_types_sync.sh`), Conventional PR title.

**CI path-filtered / not PR-gating:**

- [`e2e-smoke.yml`](.github/workflows/e2e-smoke.yml) — changes under `src/**` or `e2e/**`
- [`e2e-email.yml`](.github/workflows/e2e-email.yml) — not PR-gating

Report skipped, unavailable, or CI-only checks in the PR. Distinguish failures you introduced from pre-existing failures.

Details: [`.agents/skills/verify-change/SKILL.md`](.agents/skills/verify-change/SKILL.md).

## Database and migrations

- Inspect existing files in `supabase/migrations/` and `src/lib/database/supabase-types.ts` before changing schema.
- Prefer additive, backward-compatible migrations.
- Name new migrations with timestamps (`supabase migration new name_of_change` or `YYYYMMDDHHMMSS_name.sql`). Do not use sequential `0001` prefixes.
- After a local schema change: `npm run gen:types` and commit `src/lib/database/supabase-types.ts`.
- Do **not** apply migrations to UAT or production. Those use `workflow_dispatch` workflows that Thomas runs.
- Do **not** run `npm run gen:types:prod` against production.
- Do **not** reset or seed UAT/production. `npm run seed:uat:reset`, `seed:uat:full-reset`, and [`.github/workflows/uat-seed.yml`](.github/workflows/uat-seed.yml) are destructive and require explicit issue authorisation.
- Local `supabase db reset` and `npm run seed:dev` are allowed only on a disposable local stack.

Details: [`.agents/skills/database-migration-safety/SKILL.md`](.agents/skills/database-migration-safety/SKILL.md).

## Environment boundaries

| Environment | Agent boundary |
|-------------|----------------|
| Local / disposable | Normal development and testing with synthetic data. Local Supabase reset/seed is allowed. |
| CI | Automated validation with dummy Supabase env vars and ephemeral Postgres. |
| Demo | Not a supported runtime. Do not revive IndexedDB/demo mode unless the issue explicitly requires it. |
| UAT | Validate through documented workflows and preview deploys. No reset, reseed, migration, or data mutation unless the issue explicitly authorises it. |
| Production | No autonomous access, query, mutation, migration, seeding, reset, deployment, merge, or secret use. |

## Authentication, authorization, secrets, child data

Treat guardian contact information, child records, attendance, incidents, medical information, allergies, and registrations as **sensitive**.

Roles: `ADMIN`, `MINISTRY_LEADER`, `GUARDIAN`, `VOLUNTEER`, `GUEST` (`src/lib/auth-types.ts`). Roles currently live in client-writable `user_metadata`; do not expand that pattern. RLS is incomplete; do not assume the database enforces household or ministry scope.

Agents must:

- Use synthetic fixtures and accounts in tests, screenshots, logs, and documentation.
- Never paste, commit, log, expose, or reproduce real family data.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or other secrets to browser/client code. Privileged work stays in server routes, `src/lib/supabaseAdmin.ts`, or scripts.
- Keep UI data flowing through the DAL / React Query hooks. Do not import `@supabase/supabase-js` outside the DAL and allowed API/script paths (ESLint `no-restricted-imports`).
- Add positive and negative authorization tests when changing authentication, roles, household access, ministry scoping, or RLS.
- Verify guardians cannot access another household.
- Verify ministry-scoped roles cannot escape their authorised scope.
- Flag any change that expands data visibility or privilege.
- Redact PII in screenshots and artifacts.
- Escalate any ambiguity involving access control, sensitive-data visibility, or privilege expansion.

Known unsafe surfaces exist (see `docs/PRODUCT_SPEC.md`). Do not copy them into new code.

## PR size, evidence, and completion

- Draft PRs only. Agents must not merge or deploy.
- Use the checklist in [`.agents/skills/pr-evidence/SKILL.md`](.agents/skills/pr-evidence/SKILL.md) and [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).
- Completed work moves to **PR Review** with `agent:review-ready`. It is not finished until Thomas reviews it.
- Agents must not mark work **Done** unless the issue was explicitly documentation-only and closure was authorised.

## Human-input escalation

When a material decision is required:

1. Stop work affected by the decision.
2. Apply `agent:needs-input`.
3. Move the Project item to **Needs Thomas** when permitted.
4. Post **one** structured comment mentioning `@tzlukoma`, with options and a recommendation.
5. Leave the PR in draft.
6. Do not post reminders while waiting.

If you cannot update labels or Project fields, still post the comment and ask Thomas to apply them.

Template and resume rules: [`.agents/skills/escalate-to-human/SKILL.md`](.agents/skills/escalate-to-human/SKILL.md).

## Prohibited autonomous actions

- Merge pull requests.
- Deploy to Vercel, UAT, or production.
- Run production or UAT migrations, seeds, resets, or backups.
- Change GitHub environment secrets, Vercel env vars, or branch protections.
- Use production credentials, query production data, or copy real family records into the repo.
- Install or configure Devin.
- Manually bump `package.json` `version` (release-please owns that).
- Mark agent work **Done** or ready-for-review as if merge were authorised.

## Skills

| When | Procedure |
|------|-----------|
| Starting or implementing an issue | [`.agents/skills/implement-ticket/SKILL.md`](.agents/skills/implement-ticket/SKILL.md) |
| Choosing and reporting checks | [`.agents/skills/verify-change/SKILL.md`](.agents/skills/verify-change/SKILL.md) |
| Schema, SQL, or generated types | [`.agents/skills/database-migration-safety/SKILL.md`](.agents/skills/database-migration-safety/SKILL.md) |
| Opening or updating the draft PR | [`.agents/skills/pr-evidence/SKILL.md`](.agents/skills/pr-evidence/SKILL.md) |
| Blocked on a material decision | [`.agents/skills/escalate-to-human/SKILL.md`](.agents/skills/escalate-to-human/SKILL.md) |

Claude-specific Playwright setup remains in [`.claude/skills/e2e/SKILL.md`](.claude/skills/e2e/SKILL.md).

## Further reading

- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — branching and conventional commits
- [`docs/CI_CD.md`](docs/CI_CD.md) — environments, workflows, deploy authority
- [`docs/REACT_QUERY_STANDARDS.md`](docs/REACT_QUERY_STANDARDS.md) — data-fetching conventions
- [`docs/testing.md`](docs/testing.md) — Jest and Playwright layout
- [`docs/GENERATE_SUPABASE_TYPES.md`](docs/GENERATE_SUPABASE_TYPES.md) — type generation
- [`docs/SUPABASE_API_KEYS.md`](docs/SUPABASE_API_KEYS.md) — publishable vs secret keys
