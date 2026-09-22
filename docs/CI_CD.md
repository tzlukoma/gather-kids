# CI/CD Runbook — gatherKids

**Branch model:** Trunk-based — all PRs target **`main`**. UAT is a GitHub Environment + Supabase project + Vercel Preview, not a git branch.

Related: [`docs/CI_CD_CLEANUP_PLAN.md`](./CI_CD_CLEANUP_PLAN.md), [`docs/CONTRIBUTING.md`](./CONTRIBUTING.md), [`AGENTS.md`](../AGENTS.md) (agents must not run deploy or shared-DB workflows)

---

## Architecture

```
feature/* ──PR──► main  ◄── release-please Release PR (semver tag)
                    │
                    ▼
              Build complete
              Vercel builds the commit. With production-domain
              auto-assign off, that build is staged, not live.
                    │
        ┌───────────┴────────────────┐
        ▼                            ▼
   UAT DB deploy                Production release
   (GitHub env: uat)            (GitHub env: production, reviewers)
   dry-run → apply →            approval pending → schema →
   /api/version + /api/health   staged /api/version → promote →
        │                       production /api/version + /api/health
        ▼                            ▼
   UAT verified                 Production released

scheduled digest / keepalive stay on GitHub env production-ops
and do not promote a release.
```

| Name | What it is |
|------|------------|
| **`main`** | Only long-lived git branch and PR target. A merge is **Build complete**, not a finished production release. |
| **UAT** | GitHub Environment `uat` + UAT Supabase + the UAT app named by `UAT_APP_URL` |
| **Production** | Staged Vercel production deployment + GitHub Environment `production` (required reviewers). Live only after **Production released**. |
| **Production ops** | GitHub Environment `production-ops` — unattended scheduled prod jobs (no reviewers). Not a release path. |

### GitHub Environments

| Environment | Required reviewers | Used by |
|-------------|-------------------|---------|
| **`uat`** | No | UAT DB deploy, UAT digest, UAT keepalive |
| **`production`** | Yes (Thomas) | Destructive / promote jobs: [`prod-db-deploy.yml`](../.github/workflows/prod-db-deploy.yml), [`db-backup.yml`](../.github/workflows/db-backup.yml) when input is `PROD`, [`ministry-enrollment-report.yml`](../.github/workflows/ministry-enrollment-report.yml) prod job |
| **`production-ops`** | **No** | Scheduled + routine prod ops: `digest-prod` in [`daily-digest.yml`](../.github/workflows/daily-digest.yml), prod [`supabase-keepalive.yml`](../.github/workflows/supabase-keepalive.yml) |

`production` and `production-ops` use the **same production Supabase project** credentials. `production-ops` is not a second database.

Scheduled jobs **must not** use `production`. That environment’s required-reviewer gate pauses every run at **Review deployments**, so cron would stall until someone approves. `production-ops` has no reviewers or wait timers so digest and keepalive run unattended.

---

## What runs on every PR

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

| Job | Command / action |
|-----|------------------|
| `lint` | `npm run lint` |
| `typecheck` | `npm run typecheck` |
| `test` | `npm test` |
| `build` | `npm run build` (dummy Supabase env vars) |
| `db-fk` | Fail-fast apply (`ON_ERROR_STOP=1`) of `supabase/migrations/*.sql` to Postgres 15, FK checks, migration-status RPC, types drift check |
| `schema-change` | When `supabase/migrations/**` changes, require a `Schema change: documented` line in the PR body |
| `Conventional PR title` | `amannn/action-semantic-pull-request` |

Path-filtered (not every PR):

| Workflow | When |
|----------|------|
| [`e2e-smoke.yml`](../.github/workflows/e2e-smoke.yml) | Changes under `src/**` or `e2e/**` — dummy-Supabase page-load smoke (fast; not a deploy gate) |
| [`e2e-email.yml`](../.github/workflows/e2e-email.yml) | Push to `main` + manual dispatch (not PR-gating) |

### After merge to `main` (production deploy gate)

| Workflow | When |
|----------|------|
| [`e2e-registration-smoke.yml`](../.github/workflows/e2e-registration-smoke.yml) | Push to `main` (+ manual dispatch). Starts ephemeral local Supabase and runs first-time + returning `/register` submit (`e2e/registration-smoke.spec.ts`). Job name: **`e2e-registration`**. |

Vercel currently deploys Production as soon as `main` is updated. To make **`e2e-registration` required for Production**, add that GitHub check under the gatherKids Vercel project → **Settings → Git → Required Checks for Production** (or Deployment Checks). Until that is set, the workflow still runs on `main` and failures are visible, but Production can ship in parallel.

Do not add `e2e-registration` as a **PR** required check — it does not run on pull requests.

Node **22.22.2**, Supabase CLI **2.116.0** (pinned in composite action).

---

## Conventional Commits (required)

release-please reads squash-merge commits on **`main`**. PR titles must start with `feat:`, `fix:`, `chore:`, `ci:`, `docs:`, etc.

See [`docs/CONTRIBUTING.md`](./CONTRIBUTING.md) and [`commitlint.config.js`](../commitlint.config.js).

**Do not** manually bump `package.json` version — merge the release-please Release PR.

---

## How releases work

1. Conventional commits land on **`main`** via squash merge. That is **Build complete**.
2. [`release-please.yml`](../.github/workflows/release-please.yml) opens a **Release PR** updating `package.json` + `CHANGELOG.md`.
3. Merging the Release PR creates git tag `vX.Y.Z` and a GitHub Release. The tag is the app version, not a database release and not production traffic.
4. **UAT verified** and **Production released** are separate manual workflows. A green Vercel build does not complete either one.

## Release states

These names are the only ones a workflow summary should use for a release. The summary also lists SHA, app version, target environment, expected migration, applied migration, applied count, `inSync`, health, and the deployment URL. It does not print database URLs or keys.

| State | What is true | Who advances it | Evidence |
|-------|----------------|-----------------|----------|
| **Build complete** | CI passed and Vercel built the commit. Production domains were not intentionally moved. | Merge to `main` | Green CI and a Vercel deployment for the SHA |
| **UAT schema pending** | The UAT app for this commit is not in sync with the UAT database, or the deployed build is a different commit. | Nobody. The UAT job fails. | UAT DB deploy summary |
| **UAT verified** | UAT `/api/version` has `inSync: true` for this SHA, and `/api/health` is ok. | UAT DB deploy, run by someone who can use the `uat` environment | Summary state `UAT verified` |
| **Production approval pending** | Production release is waiting on the `production` environment reviewers. | Thomas approves that GitHub deployment | The waiting environment review |
| **Production DB verified** | The staged production build matches the applied production schema. Domains have not moved yet. | Production release, after approval and before promote | Staged `/api/version` check inside the job |
| **Production released** | The production domain serves that build, `inSync` is true, and health is ok. | Production release, after `vercel promote` and the domain check | Summary state `Production released` |

**Production released** is the only completed production deployment. **Build complete** is not.

### Failure paths

| What failed | What you see | What stays in place |
|-------------|----------------|---------------------|
| Migration dry-run | Job fails. Summary is not `UAT verified`. | UAT schema unchanged |
| Migration apply | Job fails before verification or promotion | Previous schema. Production domains stay if promote has not run |
| Status RPC missing, or `/api/version` not HTTP 200 | State `failed` | No promote |
| Build SHA and database disagree | `UAT schema pending`, or `failed` on a production release | No promote |
| App needs to go back after an additive migration | Promote the previous deployment URL | Schema stays. Do not restore an old database backup. Ship a forward migration if the schema itself must change. |

---

## Version visibility (app vs DB)

Two independent identifiers:

| Identifier | Source |
|------------|--------|
| **App release** | Git tag / `package.json` semver (release-please) |
| **DB schema** | Latest numeric `version` in `supabase_migrations.schema_migrations` (what `supabase db push` records) |

`inSync` on `/api/version` is the code/schema deployment-order signal: it is `true` only when the build's stamped expected version equals the remote applied version. Anything else — older remote, newer remote, missing RPC, or missing credentials — is `false`. The endpoint never treats an undetermined database as current.

### `GET /api/version`

Returns JSON:

```json
{
  "app": "1.7.0",
  "gitSha": "a1b2c3d4e5f6789012345678901234567890abcd",
  "gitShaShort": "a1b2c3d",
  "gitRef": "main",
  "deployEnv": "uat",
  "supabaseProjectRef": "abcd1234",
  "db": {
    "expectedMigration": "20260921200000",
    "appliedMigration": "20260921200000",
    "appliedCount": 72,
    "inSync": true
  }
}
```

`Cache-Control: no-store` — reflects post-migrate state.

| `db` field | Meaning |
|------------|---------|
| `expectedMigration` | Numeric Supabase version stamped from `supabase/migrations/` at build time (not a filename) |
| `appliedMigration` | Latest numeric version from `supabase_migrations.schema_migrations` via `fn_schema_migration_status()` |
| `appliedCount` | Row count in that history table, or `null` if status could not be read |
| `inSync` | `true` only when both versions are present and equal |

`latestMigration` (a ledger filename) is no longer returned. Use `appliedMigration`. History is **not** `public.schema_migration_ledger` — that table is leftover from an older runner and is not updated by `supabase db push`.

The status function is `SECURITY DEFINER`, takes no arguments, and is executable only by `service_role`. `/api/version` calls it with the server-only service-role client. Browser code only sees the aggregate JSON above.

### Admin footer badge

[`AppVersionBadge`](../src/components/AppVersionBadge.tsx) in the admin sidebar shows `v1.7.0 · uat` with a tooltip for git, Supabase ref, expected vs applied migration versions, and whether the schema is in sync with this build.

Set in Vercel:

| Variable | Production | Preview |
|----------|------------|---------|
| `NEXT_PUBLIC_DEPLOY_ENV` | `production` | `uat` |

### Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| App version new, `inSync: false`, applied version older | Vercel deployed; UAT/prod DB deploy workflow not run |
| `inSync: false`, applied version newer than expected | Migrations applied; this build is older than the database (OK if code unchanged) |
| `appliedMigration` null, `inSync: false` | Status RPC missing (migration not applied yet), service-role misconfigured, or dummy CI env |
| Same URL, wrong Supabase ref | Vercel env vars point at wrong project |
| Preview shows prod keys | Vercel Preview env misconfigured |
| Workflow fires on `uat` branch push | Legacy workflow not removed — should not happen after cleanup |

---

## Sentry init and env

Runtime init (no sample-rate or Replay policy changes here):

| Runtime | File |
|---------|------|
| Browser | `src/instrumentation-client.ts` |
| Node server | `sentry.server.config.ts` |
| Edge | `sentry.edge.config.ts` |

`environment` comes from `NEXT_PUBLIC_DEPLOY_ENV` or `VERCEL_ENV`. `release` is the stamped app version (`package.json` / `src/lib/build-info.ts`). Set `NEXT_PUBLIC_SENTRY_DSN` in Vercel; never commit the real DSN.

GitHub CI (`ci.yml`) runs dummy `next build` jobs. Those builds must **not** upload source maps — do not add `SENTRY_AUTH_TOKEN` to `ci.yml`. Vercel source-map upload, uptime, and cron check-ins are a separate ops follow-up.

---

## PostHog (usage events + flags)

Full agent/developer guide: [`docs/FEATURE_FLAGS.md`](./FEATURE_FLAGS.md).

One PostHog Cloud project is shared by UAT and production. Isolation is `deploy_env` on persons and `{deploy_env}:{auth uuid}` distinct ids — not separate projects.

| Variable | Production | Preview |
|----------|------------|---------|
| `NEXT_PUBLIC_DEPLOY_ENV` | `production` | `uat` |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | project API key (`phc_…`) | same |
| `NEXT_PUBLIC_POSTHOG_HOST` | ingest host (`https://us.i.posthog.com` or `eu`) | same |

Browser usage events initialize only in deployed UAT/production (`src/lib/analytics/browser.ts`). Local `next dev`, tests, CI, and localhost do not send.

Server feature flags (`src/lib/flags/`) evaluate via `posthog-node` in UAT/production only. Local and test return caller defaults (GatherSystem **off**). Browser flag fetches stay disabled.

Create these boolean flags in PostHog (default off; target `deploy_env = uat` until a production flip):

- `gathersystem_door`
- `gathersystem_guardian`
- `gathersystem_bible_bee_household`

Production flag flips are Thomas-only. Do not put email, names, or child identifiers in flag payloads or person properties.

---

## Canonical remote schema path

`supabase_migrations.schema_migrations` is the only migration history. A remote schema change is complete only when `supabase db push` records it there.

| Environment | Workflow | Gate |
|-------------|---------|------|
| Local disposable | `supabase db push` after `supabase start` | None |
| UAT | [`.github/workflows/uat-db-deploy.yml`](../.github/workflows/uat-db-deploy.yml) | GitHub Environment `uat` |
| Production | [`.github/workflows/prod-db-deploy.yml`](../.github/workflows/prod-db-deploy.yml) | GitHub Environment `production` (required reviewers) |

Both remote workflows call [`scripts/db/apply_migrations_cli.sh`](../scripts/db/apply_migrations_cli.sh), which dry-runs and then runs `supabase db push --include-all`. Production runs [`scripts/db/ensure_pgcrypto.sh`](../scripts/db/ensure_pgcrypto.sh) first. That extension pre-step is part of this workflow, not a second schema path.

Do not apply remote SQL with `psql`, a ledger runner, or an ad-hoc executor. [`scripts/db/apply_migrations_safe.sh`](../scripts/db/apply_migrations_safe.sh) writes `public.schema_migration_ledger`, which `supabase db push` does not read. That script, the table-setup scripts, and `execute_sql_reliable.sh` now exit immediately.

### Quarantined workflows

These files stay in `.github/workflows/` so a manual run refuses before it can touch a database. They do not load secrets.

| Workflow | Former behavior |
|----------|-----------------|
| [`uat-db-check.yml`](../.github/workflows/uat-db-check.yml) | Ledger apply via `apply_migrations_safe.sh` |
| [`setup-tables-on-demand.yml`](../.github/workflows/setup-tables-on-demand.yml) | Ad-hoc `CREATE TABLE` on UAT or production |
| [`ensure-pgcrypto.yml`](../.github/workflows/ensure-pgcrypto.yml) | Standalone `CREATE EXTENSION` |

### Pull request signal

Job `schema-change` compares the PR to its base. No migration diff prints `Schema change: none` and passes. A diff under `supabase/migrations/` fails unless the PR body contains this line on its own:

```text
Schema change: documented
```

`Schema change: none` does not satisfy that check. Add `schema-change` to the required checks on `main` next to `db-fk` so a missing declaration cannot merge.

## Database deploy (manual)

### UAT — [`uat-db-deploy.yml`](../.github/workflows/uat-db-deploy.yml)

Set GitHub Environment variable **`UAT_APP_URL`** on **`uat`** to the UAT app origin (`https://…`, no path). The workflow fails closed when it is missing. It is not a secret.

#### Dry-run → apply → verify

1. GitHub → **Actions** → **UAT DB deploy** → **Run workflow** on **`main`**.
2. `dry_run: true` lists pending migrations and does not apply them. The summary says `dry run — not UAT verified`.
3. Run again with `dry_run: false`. Leave `git_sha` empty to use the selected `main` commit, or paste a full 40-character SHA that is already on `main`.
4. The job checks out that SHA, applies migrations with `scripts/db/apply_migrations_cli.sh`, and runs FK checks. `check_fks.sh` treats `leader_assignments.leader_id` as a `leader_profiles` reference, not `users`.
5. It reads `supabase_migrations.schema_migrations`, then `GET $UAT_APP_URL/api/version` and `GET /api/health`.

**`UAT verified`** requires all of these: HTTP 200, `deployEnv` is `uat`, `gitSha` equals the selected commit, `expectedMigration` equals `appliedMigration`, `inSync` is true, the endpoint's applied version equals the database query, and `/api/health` returns `{ "status": "ok" }`.

Anything else fails the job. A deployed build that is not this commit, or a build whose expected migration does not match the database, is **`UAT schema pending`**. A missing URL, a non-200 response, a missing status RPC, or a non-UAT `deployEnv` is **`failed`**. Neither state is UAT verified.

The summary shows SHA, app version, app URL, expected and applied migrations, applied count, `inSync`, health, and the state. It does not print database URLs or keys.

**No auto-commit** of generated types.

### Production schema — [`prod-db-deploy.yml`](../.github/workflows/prod-db-deploy.yml)

Schema only. This does not assign production traffic.

1. **Actions** → **Production DB deploy** → **Run workflow**
2. Requires GitHub Environment **`production`** approval
3. Runs `ensure_pgcrypto` → migrations (**fail-fast**) → FK checks → snapshot
4. **No auto-commit** of types

### Production release — [`prod-release.yml`](../.github/workflows/prod-release.yml)

This is the only path that should put a new build on production domains.

Before the first release, in the Vercel project turn off automatic assignment of production domains (**Auto-assign Custom Production Domains**, under the production environment or Git settings). `main` must still create a production deployment. That deployment stays staged until this workflow promotes it. Until that setting is off, a merge to `main` can still take production traffic by itself, and this workflow cannot stop that.

On the `production` GitHub Environment, set:

| Name | Kind | Purpose |
|------|------|---------|
| `VERCEL_TOKEN` | secret | `vercel promote` of the staged deployment |
| `PROD_APP_URL` | variable | Production origin (`https://…`, no path) for the post-promotion check |

1. Merge to `main` and wait until Vercel has a staged production deployment for that SHA. Copy its `https://….vercel.app` URL. Do not paste the production domain.
2. **Actions** → **Production release** → **Run workflow**. Enter the full `main` SHA and that staged URL.
3. GitHub Environment **`production`** approval is required. The summary before approval is **Production approval pending** (the environment gate). Nothing is promoted until a reviewer approves.
4. The job checks out that SHA, dry-runs and applies migrations with `scripts/db/apply_migrations_cli.sh`, runs FK checks, then requires the staged URL's `/api/version` to be **Production DB verified** (`deployEnv` production, `gitSha` matches, `inSync` true).
5. Only then does it run `vercel promote` on that staged URL.
6. It calls `PROD_APP_URL` `/api/version` and `/api/health`. The summary says **Production released** only when those checks pass.

A failed migration, status check, or staged-build mismatch exits before promotion. Production domains stay on the previous deployment. The summary state is `failed`.

If promotion succeeds and the domain check fails, the summary says `failed` and **Promotion: attempted**. The schema is not rolled back. Put the previous app back by promoting that earlier deployment URL. Do not restore an old database backup over an additive migration; ship a forward fix.

Legacy secret names (`UAT_*`, `PROD_*`) are supported as fallbacks during transition.

---

## Supabase types

**On every PR:** `db-fk` job runs [`scripts/db/check_types_sync.sh`](../scripts/db/check_types_sync.sh) against a local Postgres with migrations applied.

The script distinguishes a real failure from an infrastructure one, and CI depends on the difference:

| Exit | Meaning | CI behaviour |
|------|---------|--------------|
| `0` | Types match the migrated schema | pass |
| `1` | Types are out of sync — **a real failure**, diff is printed | fail immediately, no retry |
| `2` | Generation failed before any comparison happened | retried up to 3 times with backoff, then fail |

Exit `2` is almost always a container-registry throttle. `supabase gen types` starts a `postgres-meta` container pulled from ECR Public, which rate-limits anonymous pulls per source IP; CI runners share NAT addresses, so `toomanyrequests: Rate exceeded` appears periodically and says nothing about the schema. It is a throttle rather than an exhausted quota, so a short backoff clears it.

If exit `2` persists across all three attempts, look at the pinned Supabase CLI version in [`.github/actions/setup-supabase-cli`](../.github/actions/setup-supabase-cli/action.yml) and the `postgres-meta` image it resolves to — not at the schema.

**After adding a migration locally:**

```bash
npm run gen:types
git add src/lib/database/supabase-types.ts
```

**Emergency regen from linked UAT/prod:** Actions → **Generate Supabase Types** (`gen-supabase-types.yml`). Uploads artifact; optional PR via `open_pr: true`. Never pushes directly to `main`.

---

## Ops workflows (scheduled / manual)

GitHub Actions only registers workflow files **directly** under [`.github/workflows/`](../.github/workflows/) — not in subfolders. These ops workflows live at the top level alongside `ci.yml`.

Prod jobs that must run on a schedule use GitHub Environment **`production-ops`** (no reviewers). Manual destructive/promote jobs keep **`production`** so required reviewers still apply.

| Workflow | Purpose | Prod GitHub Environment |
|----------|---------|-------------------------|
| [`daily-digest.yml`](../.github/workflows/daily-digest.yml) | Scheduled + manual digest emails | `production-ops` (`digest-prod`) |
| [`supabase-keepalive.yml`](../.github/workflows/supabase-keepalive.yml) | Prod Supabase keepalive | `production-ops` |
| [`supabase-keepalive-uat.yml`](../.github/workflows/supabase-keepalive-uat.yml) | UAT keepalive | `uat` |
| [`db-backup.yml`](../.github/workflows/db-backup.yml) | DB backup | `production` when input is `PROD` |
| [`ministry-enrollment-report.yml`](../.github/workflows/ministry-enrollment-report.yml) | Enrollment reporting | `production` (manual; approval acceptable) |
| [`check-auth-users.yml`](../.github/workflows/check-auth-users.yml) | Auth user audit | none |

### UAT seed (destructive)

[`uat-seed.yml`](../.github/workflows/uat-seed.yml) — full reset requires:

- `reset_mode: true`
- `confirm: RESET`

**Do not run UAT seed reset during R1** (see R1 plan).

### Daily digest dry-run

Actions → **Daily Digest** → set `dry_run: true`. Choose `PROD` or `UAT`. A PROD run uses `production-ops` and must **not** prompt for deployment approval.

---

## GitHub Environment secrets (names only)

DB deploy / types jobs (`uat`, `production`):

| Secret | `uat` | `production` |
|--------|-------|----------------|
| `SUPABASE_URL` | ✓ | ✓ |
| `DATABASE_URL` | ✓ | ✓ |
| `SUPABASE_ACCESS_TOKEN` | ✓ | ✓ |
| `SUPABASE_DB_PASSWORD` | ✓ | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ |

Legacy aliases: `UAT_SUPABASE_URL`, `PROD_SUPABASE_URL`, `UAT_DATABASE_URL`, `PROD_DATABASE_URL`.

Environment **variable** (not a secret) on `uat`: `UAT_APP_URL` — UAT app origin used by UAT DB deploy to read `/api/version` and `/api/health`.

Scheduled prod ops (`production-ops`) — same production credential **values** as `production`, ops-scoped names only. Do **not** add `SENTRY_AUTH_TOKEN` or DB-deploy tokens unless a workflow truly needs them. Do **not** add required reviewers on this environment.

| Secret | Needed for |
|--------|------------|
| `PROD_SUPABASE_URL` | digest, keepalive |
| `PROD_SUPABASE_SERVICE_ROLE_KEY` | digest, keepalive |
| `PROD_MJ_API_KEY` | digest |
| `PROD_MJ_API_SECRET` | digest |
| `PROD_FROM_EMAIL` | digest |
| `PROD_MONITOR_EMAILS` | digest |
| `PROD_EMAIL_MODE` | digest (optional; workflow falls back to `mailjet`) |
| `SENTRY_DSN` | digest cron check-in only |

See [`docs/SUPABASE_API_KEYS.md`](./SUPABASE_API_KEYS.md) for publishable vs secret key terminology.

---

## Local validation before opening a PR

```bash
npm ci
npm run lint && npm run typecheck && npm test -- --passWithNoTests
```

Optional: `echo "ci: my change" | npx commitlint`

---

## Phase 8 (Thomas — after merge)

1. Merge cleanup PR to **`main`**
2. Delete legacy git branches `develop`, `uat`, `release` if not already done
3. Enable branch protection required checks on **`main`**: `lint`, `typecheck`, `test`, `build`, `db-fk`, `schema-change`, `Conventional PR title`
4. Run **UAT DB deploy** (dry-run, then apply)
5. Confirm Vercel preview + production + `/api/version` footer

Then start [`docs/R1_IMPLEMENTATION_PLAN.md`](./R1_IMPLEMENTATION_PLAN.md).

---

## Sentry (ops wiring)

This section covers **source maps, uptime, the one free cron monitor, alerts, and PAYG**. SDK init (`release`, `environment`, DSN env vars) is [#258](https://github.com/tzlukoma/gather-kids/issues/258). Sampling and Replay are [#259](https://github.com/tzlukoma/gather-kids/issues/259).

### Release tags vs source maps

`package.json` version (release-please) is stamped into `src/generated/build-info.json` at `prebuild` and exposed as `buildInfo.appVersion` (`src/lib/build-info.ts`) and `GET /api/version`.

`src/generated/` is **gitignored** — nothing under it is committed. `scripts/inject-build-info.mjs` regenerates `build-info.json` on `postinstall` (so it exists right after `npm ci`, for editors and ad-hoc `npx jest`) and again on `predev` / `prebuild` / `pretypecheck` / `pretest` (so each run stamps fresh values). `next.config.ts` imports it transitively via `src/lib/sentry/release.ts`, so *any* command that loads the Next config — including `jest` through `next/jest` — needs the file present.

[#258](https://github.com/tzlukoma/gather-kids/issues/258) / [#264](https://github.com/tzlukoma/gather-kids/pull/264) set SDK `release` from `buildInfo.appVersion` so uploaded maps and runtime events share the same release name (for example `1.8.2`). `withSentryConfig` in `next.config.ts` uses the same `resolveSentryRelease()` helper (`src/lib/sentry/release.ts`) so webpack source-map uploads tag that semver instead of the git commit SHA. Optional override: set `SENTRY_RELEASE` in the build environment.

### `SENTRY_AUTH_TOKEN` (Vercel only — never `ci.yml`)

Source maps upload from the **Vercel production build** when `SENTRY_AUTH_TOKEN` is present. `withSentryConfig` already reads `process.env.SENTRY_AUTH_TOKEN`.

| Where | Set `SENTRY_AUTH_TOKEN`? |
|-------|--------------------------|
| Vercel **Production** | Yes (required for readable production stack traces) |
| Vercel Preview / UAT | Optional (only if you want maps on preview builds) |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | **Never.** CI builds with dummy env and must not upload maps. |
| GitHub Environment secrets for app CI | **Never.** Do not add Sentry org tokens to CI. |

Token scopes (create in Sentry; dashboard click is Thomas-only): release/org:read + project:releases + artifact upload, as required by current Sentry docs.

### Verify a production release after a Vercel deploy

After `SENTRY_AUTH_TOKEN` is set on Vercel Production:

1. Deploy production (merge to `main` → Vercel Production).
2. Confirm `/api/version` `app` matches `package.json` (for example `1.8.2`).
3. In Sentry → **Releases**, open that same version. It should list uploaded artifacts (source maps).
4. Open a production issue (or wait for a real one). Stack frames should resolve to TypeScript sources, not minified webpack chunks.

If the release is missing, the Vercel build likely skipped upload (`SENTRY_AUTH_TOKEN` unset) or the deploy did not run `prebuild` / stamp `build-info`.

### Uptime monitor (one, Thomas creates in the UI)

- **Target:** production origin + `GET /api/health`
- **Example:** `https://gatherkidslive.com/api/health` (confirm the live custom domain in Vercel if this host changes)
- **Expected:** HTTP 200, JSON `{ "status": "ok", "timestamp": "<ISO-8601>" }`
- Create **one** uptime monitor in the Sentry UI. Do not add extra monitors (paid / Team).

### Cron monitor (daily digest only)

gatherKids crons are GitHub Actions, not Vercel Cron. `automaticVercelMonitors` is `false` in `next.config.ts`.

| Job | Sentry cron monitor? |
|-----|----------------------|
| [`.github/workflows/daily-digest.yml`](../.github/workflows/daily-digest.yml) **PROD** (scheduled `0 11 * * *`) | **Yes — this is the one free cron monitor** |
| Daily digest UAT (manual dispatch only) | No |
| `supabase-keepalive.yml` and other scheduled ops workflows | **No** — do not instrument |

- **Monitor slug:** `daily-digest`
- **Schedule upserted on check-in:** `0 11 * * *` (`America/New_York`), 15-minute margin, 30-minute max runtime
- **Check-in:** `sentry-cli monitors run daily-digest -- …` wraps `node scripts/dailyDigest.js`. CLI check-ins authenticate with the **project DSN**, not an org auth token.

**GitHub Environment secret (digest workflow only):**

| Secret | GitHub Environment | Used by |
|--------|--------------------|---------|
| `SENTRY_DSN` | `production-ops` | `digest-prod` in `daily-digest.yml` |

If `SENTRY_DSN` is unset, the digest still runs and the step emits a notice. Do **not** put this secret (or `SENTRY_AUTH_TOKEN`) on `ci.yml`. Do **not** add Sentry org tokens to GitHub Environments for app CI.

`digest-prod` reads `SENTRY_DSN` from **`production-ops`**, not from gated `production`. Mirror the DSN onto `production-ops` (same value as `production` during transition is fine). The Sentry CLI `--environment production` flag is the Sentry runtime environment name, not the GitHub Environment.

After the first successful scheduled (or manual PROD) run with `SENTRY_DSN` set, confirm the `daily-digest` monitor appears in Sentry → Crons. Create it in the UI only if the first check-in did not upsert it.

### Email alerts

In Sentry → Alerts, create email rules for:

- **New issue** (first seen)
- **Regression** (resolved issue that reappears)

Do not alert on every event (that burns inbox and quota).

### Subscription PAYG budget

Confirm the Developer plan **pay-as-you-go budget is $0** so over-quota traffic is dropped instead of billed. Do not invent a non-zero budget.
