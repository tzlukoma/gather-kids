# CI/CD Runbook — gatherKids

**Branch model:** Trunk-based — all PRs target **`main`**. UAT is a GitHub Environment + Supabase project + Vercel Preview, not a git branch.

Related: [`docs/CI_CD_CLEANUP_PLAN.md`](./CI_CD_CLEANUP_PLAN.md), [`docs/CONTRIBUTING.md`](./CONTRIBUTING.md), [`AGENTS.md`](../AGENTS.md) (agents must not run deploy or shared-DB workflows)

---

## Architecture

```
feature/* ──PR──► main  ◄── release-please Release PR (semver tag)
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
   ci.yml      Vercel       workflow_dispatch
   on PR       Preview      uat-db-deploy  (GitHub env: uat)
   + push      per PR       → UAT Supabase migrations
   main        UAT env vars
        │
        └── merge to main ──► Vercel Production (prod Supabase)
                    │
                    └── workflow_dispatch prod-db-deploy (GitHub env: production)

footer tooltip (admin): app vX.Y.Z · uat|production · db migration
ops/*.yml — scheduled / manual only
```

| Name | What it is |
|------|------------|
| **`main`** | Only long-lived git branch; PR target; Vercel production |
| **UAT** | GitHub Environment `uat` + UAT Supabase + Vercel Preview env vars |
| **Production** | Vercel Production on `main` + GitHub Environment `production` |

---

## What runs on every PR

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

| Job | Command / action |
|-----|------------------|
| `lint` | `npm run lint` |
| `typecheck` | `npm run typecheck` |
| `test` | `npm test` |
| `build` | `npm run build` (dummy Supabase env vars) |
| `db-fk` | Apply `supabase/migrations/*.sql` to Postgres 15, `check_fks.sh`, types drift check |
| `Conventional PR title` | `amannn/action-semantic-pull-request` |

Path-filtered (not every PR):

| Workflow | When |
|----------|------|
| [`e2e-smoke.yml`](../.github/workflows/e2e-smoke.yml) | Changes under `src/**` or `e2e/**` |
| [`e2e-email.yml`](../.github/workflows/e2e-email.yml) | Push to `main` + manual dispatch (not PR-gating until registration CI fixtures land) |

Node **20**, Supabase CLI **2.116.0** (pinned in composite action).

---

## Conventional Commits (required)

release-please reads squash-merge commits on **`main`**. PR titles must start with `feat:`, `fix:`, `chore:`, `ci:`, `docs:`, etc.

See [`docs/CONTRIBUTING.md`](./CONTRIBUTING.md) and [`commitlint.config.js`](../commitlint.config.js).

**Do not** manually bump `package.json` version — merge the release-please Release PR.

---

## How releases work

1. Conventional commits land on **`main`** via squash merge.
2. [`release-please.yml`](../.github/workflows/release-please.yml) opens a **Release PR** updating `package.json` + `CHANGELOG.md`.
3. Merging the Release PR creates git tag `vX.Y.Z` and a GitHub Release.
4. Vercel production build picks up the new version from `package.json`.

---

## Version visibility (app vs DB)

Two independent identifiers:

| Identifier | Source |
|------------|--------|
| **App release** | Git tag / `package.json` semver (release-please) |
| **DB schema** | Latest row in `public.schema_migration_ledger` |

### `GET /api/version`

Returns JSON:

```json
{
  "app": "1.7.0",
  "gitSha": "a1b2c3d",
  "gitRef": "main",
  "deployEnv": "uat",
  "supabaseProjectRef": "abcd1234",
  "db": { "latestMigration": "20250920120000_add_avatar_tables", "appliedCount": 68 }
}
```

`Cache-Control: no-store` — reflects post-migrate state.

### Admin footer badge

[`AppVersionBadge`](../src/components/AppVersionBadge.tsx) in the admin sidebar shows `v1.7.0 · uat` with a tooltip for git, Supabase ref, and DB migration.

Set in Vercel:

| Variable | Production | Preview |
|----------|------------|---------|
| `NEXT_PUBLIC_DEPLOY_ENV` | `production` | `uat` |

### Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| App version new, DB migration old | Vercel deployed; UAT/prod DB deploy workflow not run |
| DB migration new, app version old | Migrations applied; Vercel not redeployed (OK if code unchanged) |
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

## Database deploy (manual)

### UAT — [`uat-db-deploy.yml`](../.github/workflows/uat-db-deploy.yml)

1. GitHub → **Actions** → **UAT DB deploy** → **Run workflow**
2. Optional: `dry_run: true` lists pending migrations without applying
3. Uses GitHub Environment **`uat`** secrets
4. Applies migrations via `scripts/db/apply_migrations_cli.sh`, runs FK checks, uploads schema snapshot artifact
5. Job summary logs latest migration from `schema_migration_ledger`

**No auto-commit** of generated types.

### Production — [`prod-db-deploy.yml`](../.github/workflows/prod-db-deploy.yml)

1. **Actions** → **Production DB deploy** → **Run workflow**
2. Requires GitHub Environment **`production`** approval
3. Runs `ensure_pgcrypto` → migrations (**fail-fast**) → FK checks → snapshot
4. **No auto-commit** of types

Legacy secret names (`UAT_*`, `PROD_*`) are supported as fallbacks during transition.

---

## Supabase types

**On every PR:** `db-fk` job runs [`scripts/db/check_types_sync.sh`](../scripts/db/check_types_sync.sh) against a local Postgres with migrations applied.

**After adding a migration locally:**

```bash
npm run gen:types
git add src/lib/database/supabase-types.ts
```

**Emergency regen from linked UAT/prod:** Actions → **Generate Supabase Types** (`gen-supabase-types.yml`). Uploads artifact; optional PR via `open_pr: true`. Never pushes directly to `main`.

---

## Ops workflows (`.github/workflows/ops/`)

| Workflow | Purpose |
|----------|---------|
| `daily-digest.yml` | Scheduled + manual digest emails |
| `supabase-keepalive.yml` | Prod Supabase keepalive |
| `supabase-keepalive-uat.yml` | UAT keepalive |
| `db-backup.yml` | DB backup |
| `ministry-enrollment-report.yml` | Enrollment reporting |
| `check-auth-users.yml` | Auth user audit |

### UAT seed (destructive)

[`uat-seed.yml`](../.github/workflows/uat-seed.yml) — full reset requires:

- `reset_mode: true`
- `confirm: RESET`

**Do not run UAT seed reset during R1** (see R1 plan).

### Daily digest dry-run

Actions → **Daily Digest** → set `dry_run: true`. Choose `PROD` or `UAT` environment.

---

## GitHub Environment secrets (names only)

| Secret | `uat` | `production` |
|--------|-------|----------------|
| `SUPABASE_URL` | ✓ | ✓ |
| `DATABASE_URL` | ✓ | ✓ |
| `SUPABASE_ACCESS_TOKEN` | ✓ | ✓ |
| `SUPABASE_DB_PASSWORD` | ✓ | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ |

Legacy aliases: `UAT_SUPABASE_URL`, `PROD_SUPABASE_URL`, `UAT_DATABASE_URL`, `PROD_DATABASE_URL`.

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
3. Enable branch protection required checks on **`main`**: `lint`, `typecheck`, `test`, `build`, `db-fk`, `Conventional PR title`
4. Run **UAT DB deploy** (dry-run, then apply)
5. Confirm Vercel preview + production + `/api/version` footer

Then start [`docs/R1_IMPLEMENTATION_PLAN.md`](./R1_IMPLEMENTATION_PLAN.md).

---

## Sentry (ops wiring)

This section covers **source maps, uptime, the one free cron monitor, alerts, and PAYG**. SDK init (`release`, `environment`, DSN env vars) is [#258](https://github.com/tzlukoma/gather-kids/issues/258). Sampling and Replay are [#259](https://github.com/tzlukoma/gather-kids/issues/259).

### Release tags vs source maps

`package.json` version (release-please) is stamped into `src/generated/build-info.json` at `prebuild` and exposed as `buildInfo.appVersion` (`src/lib/build-info.ts`) and `GET /api/version`.

[#258](https://github.com/tzlukoma/gather-kids/issues/258) / [#264](https://github.com/tzlukoma/gather-kids/pull/264) set SDK `release` from `buildInfo.appVersion` so uploaded maps and runtime events share the same release name (for example `1.8.2`).

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
| [`.github/workflows/ops/daily-digest.yml`](../.github/workflows/ops/daily-digest.yml) **PROD** (scheduled `0 11 * * *`) | **Yes — this is the one free cron monitor** |
| Daily digest UAT (manual dispatch only) | No |
| `supabase-keepalive.yml` and other `ops/*` crons | **No** — do not instrument |

- **Monitor slug:** `daily-digest`
- **Schedule upserted on check-in:** `0 11 * * *` (`America/New_York`), 15-minute margin, 30-minute max runtime
- **Check-in:** `sentry-cli monitors run daily-digest -- …` wraps `node scripts/dailyDigest.js`. CLI check-ins authenticate with the **project DSN**, not an org auth token.

**GitHub Environment secret (digest workflow only):**

| Secret | GitHub Environment | Used by |
|--------|--------------------|---------|
| `SENTRY_DSN` | `production` | `digest-prod` in `daily-digest.yml` |

If `SENTRY_DSN` is unset, the digest still runs and the step emits a notice. Do **not** put this secret (or `SENTRY_AUTH_TOKEN`) on `ci.yml`. Do **not** add Sentry org tokens to GitHub Environments for app CI.

After the first successful scheduled (or manual PROD) run with `SENTRY_DSN` set, confirm the `daily-digest` monitor appears in Sentry → Crons. Create it in the UI only if the first check-in did not upsert it.

### Email alerts

In Sentry → Alerts, create email rules for:

- **New issue** (first seen)
- **Regression** (resolved issue that reappears)

Do not alert on every event (that burns inbox and quota).

### Subscription PAYG budget

Confirm the Developer plan **pay-as-you-go budget is $0** so over-quota traffic is dropped instead of billed. Do not invent a non-zero budget.
