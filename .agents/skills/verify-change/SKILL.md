---
name: verify-change
description: >
  Map gatherKids change types to lint, typecheck, Jest, build, Playwright,
  docs, and CI-only database checks. Use before opening a draft PR or when
  asked to verify a change.
---

# Change verification

Follow [`AGENTS.md`](../../../AGENTS.md). Confirm every command against `package.json` or `.github/workflows/` before running it.

## Default local gate (every PR)

CI runs these on every pull request. Run them locally unless a check is documented as CI-only below.

```bash
npm ci
npm run lint
npm run typecheck
npm test -- --passWithNoTests
npm run build
```

`npm run lint` is a required CI job. Treat a non-zero exit as a failure to fix or explain; do not assume warnings are ignorable.

## Map change type to extra checks

| Change type | Also run / attach |
|-------------|-------------------|
| Docs in `docs/` or `AGENTS.md` only | `npm run docs:validate` if `content/help/` or changelog parser inputs changed; otherwise default gate is enough |
| In-app help (`content/help/`, `src/app/help/`) | `npm run docs:validate` |
| UI / layout / routing / rendered data | Relevant Playwright spec(s); screenshots or a short recording; desktop and a mobile-width check when layout changed |
| Registration / DAL / DTOs | `npm test -- contracts/registration.contract.test.ts`; `npm test -- contracts/casing.guard.test.ts`; `npm test -- contracts/enum-sync.test.ts` |
| Schema / migrations | [database-migration-safety](../database-migration-safety/SKILL.md); `npm run gen:types` locally; CI `db-fk` is the integrity + types-drift check |
| Auth, roles, household access, ministry scope, RLS | Positive and negative authorization tests; flag privilege expansion |
| Email / magic-link mail | `npm run test:email` when those specs are in scope |
| E2E specs or `src/` user flows | `npm run test:e2e:local` for the affected spec, or the Claude e2e skill |

Prefer targeted tests first, then the default gate.

## Playwright

Local (needs `.env.e2e.local` and local services):

```bash
npm run test:e2e:local
# single spec (args after -- are passed to Playwright):
npm run test:e2e:local -- e2e/<spec>.ts
```

Claude Code: [`.claude/skills/e2e/SKILL.md`](../../../.claude/skills/e2e/SKILL.md) handles Supabase, env, and the dev server.

CI:

- [`e2e-smoke.yml`](../../../.github/workflows/e2e-smoke.yml) runs `e2e/smoke-test.spec.ts` when `src/**` or `e2e/**` change.
- [`e2e-email.yml`](../../../.github/workflows/e2e-email.yml) is **not** PR-gating.

If local Playwright cannot run (missing Docker/Supabase/browsers), say so in the PR and rely on CI smoke only when that workflow will fire.

## CI-only database checks

Do not try to reproduce the full `db-fk` job unless you have a local Postgres 15 matching CI. CI will:

1. Apply `supabase/migrations/*.sql` to ephemeral Postgres 15.
2. Run `scripts/db/check_fks.sh`.
3. Run `scripts/db/check_types_sync.sh`.

After adding a migration, still run `npm run gen:types` against **local** Supabase and commit `src/lib/database/supabase-types.ts`.

## Commands agents must not treat as verification of shared environments

| Command / workflow | Why |
|--------------------|-----|
| `npm run seed:uat:reset`, `seed:uat:full-reset` | Destructive UAT |
| `.github/workflows/uat-seed.yml` | Destructive UAT; needs `RESET` confirmation |
| `uat-db-deploy.yml`, `prod-db-deploy.yml` | Shared DB mutation; Thomas only |
| `npm run gen:types:prod` | Remote/production project types |
| `npm run seed:prod:ministries` | Production seed |

Local `npm run seed:dev` and `supabase db reset` are allowed only on a disposable local stack.

## Reporting results

In the PR, list **exact commands** and pass/fail. Example:

```text
npm run lint          pass
npm run typecheck     pass
npm test -- --passWithNoTests   pass (N suites)
npm run build         pass
npm run docs:validate pass
Playwright            skipped — no UI change
db-fk                 CI-only — will run on this PR
```

## Failures you introduced vs pre-existing

- Re-run the same command on `origin/main` (worktree or stash) when a failure looks unrelated.
- If it fails on `main`, it is pre-existing: report it, do not expand scope to fix it unless it blocks verification.
- If it fails only on your branch, fix it (counts toward the two CI-repair attempts once the PR is open).
- Lint/type errors caused by your changes are yours to fix without asking.

## Screenshots

Required for user-visible UI changes. Mark **N/A** otherwise.

- Synthetic data only.
- Redact PII if any real data appeared.
- Note viewport (desktop / mobile) when layout is involved.
