# CI/CD Cleanup Plan

**Status:** Execution runbook (do this **before** R1)  
**Related:** [`docs/R1_IMPLEMENTATION_PLAN.md`](./R1_IMPLEMENTATION_PLAN.md), [`docs/PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) § R4/R5  
**Goal:** One understandable **trunk-based** pipeline on **`main` only**: PR quality gates, Vercel previews per PR, manual DB promote (UAT Supabase → prod Supabase), **auto app releases + visible app/DB/env versions**, ops workflows separated — so R1 ships through a single green path.

**Branch model:** **`main`** is the only long-lived branch. **`uat`** is a GitHub Environment + Supabase project + Vercel Preview config — not a git branch. Retire legacy git branches **`develop`** and **`uat`** (and **`release`** if it duplicates `main`).

---

## Is doing CI/CD cleanup before R1 good reasoning?

**Yes — with a time box.**

| Why it helps R1 | Caveat |
|-----------------|--------|
| R1 touches `register/`, DAL, and migrations; you want **lint + typecheck + build + jest + FK** on every PR, not Jest alone | Don’t expand scope into Next 16, RLS, or full UAT e2e on every PR |
| Returning-family Playwright needs a **path-filtered job** and local Supabase — easier to add once CI is consolidated | Cap cleanup at **~1–2 weeks**; if it slips, start R1 Phase 0 (UAT restore) in parallel |
| UAT prod-shaped restore for R1 conflicts with **`uat-seed` full reset**; guardrails belong in CI/docs now | CI cleanup does **not** replace P0.2 (UAT data restore) — that still happens before R1 |
| Four type-gen workflows + auto-push create noise during active R1 commits | Types-in-PR-only is a habit change — document it once |
| Clear **manual UAT DB deploy** avoids accidental schema drift mid-R1 | Vercel app deploy stays as-is; don’t duplicate it in Actions |
| **App vs DB version in footer** makes “code deployed, migrations not run” obvious during R1 UAT proof | Cap versioning scope — no cross-env dashboard v1 |

**Bottom line:** Clean CI first so the R1 one-shot has one branch, one PR checklist, and one manual “promote DB” button. Stop the cleanup when the [Definition of done](#definition-of-done) below is met — do not perfect the pipeline.

---

## How to use this document

| Phase | Owner | Outcome |
|-------|-------|---------|
| **0 — Prerequisites** | Thomas | GitHub env secrets, branch rules, Vercel mapping, decisions recorded |
| **1 — Consolidate PR CI** | Agent | Single `ci.yml` with lint/typecheck/test/build/FK |
| **2 — Reusable actions + pin versions** | Agent | Composite actions; Node 20; pinned Supabase CLI |
| **3 — DB deploy workflows** | Agent | Manual dispatch UAT/prod; fail-fast; no auto-commit |
| **4 — Types + E2E tiering** | Agent | One types check; path-filtered smoke e2e |
| **5 — Release + version visibility** | Agent | release-please; `/api/version`; footer tooltip |
| **6 — Ops separation + hygiene** | Agent | Ops workflows renamed/grouped; secrets out of logs |
| **7 — Docs + validation** | Agent | `docs/CI_CD.md` runbook; all gates green |
| **8 — Merge + retire legacy branches** | Thomas | Merge cleanup PR to `main`; delete `develop` / `uat` / `release` git branches |

**Kickoff prompt for the agent (after Phase 0):**

> Execute `docs/CI_CD_CLEANUP_PLAN.md` Phases 1–7 on branch `chore/ci-cd-cleanup` (PR target: **`main`**). Do not start R1 feature work. Stop if Phase 0 validation fails.
>
> **Commits:** Every commit you create MUST use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`, etc.). PR titles MUST also follow this format — release-please reads merge commits / squash titles on `main` to build the changelog and semver bumps.

**After this plan completes**, start R1 using [`docs/R1_IMPLEMENTATION_PLAN.md`](./R1_IMPLEMENTATION_PLAN.md).

---

## Target architecture (trunk-based)

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
        │           │
        │           └── Vercel bot: "Visit Preview" on each PR
        │
        └── merge to main ──► Vercel Production (prod Supabase)
                    │
                    └── workflow_dispatch prod-db-deploy (GitHub env: production)

footer tooltip on any deploy: app v1.8.0 · uat|production · db migration
scheduled / manual ops workflows (digest, keepalive, backup, …)
```

| Name | What it is | What it is **not** |
|------|------------|-------------------|
| **`main`** | Only long-lived git branch; PR target; production deploy | — |
| **UAT** | GitHub Environment `uat` + UAT Supabase + Vercel **Preview** env vars | A git branch |
| **Production** | Vercel Production on `main` + GitHub Environment `production` | Same as UAT |
| **Preview URL** | Vercel deployment for a **PR** (any branch) | Tied to `develop` |

**Principles**

1. **Trunk-based:** all work merges to **`main`** via PR. No `develop → main` promotion step.
2. **Vercel deploys the app.** GitHub Actions does not rebuild/deploy Next.js unless you add that later on purpose.
3. **GitHub Actions owns:** tests, migration apply, FK checks, type drift check, scheduled ops, **release PRs (release-please)**.
4. **Two version numbers, always separate:** **app release** (git tag / semver) vs **DB schema** (latest row in `schema_migration_ledger`). Never bump DB version in `package.json`.
5. **No auto `git push` from CI** for generated types (developer commits types in the same PR as migrations). release-please’s Release PR is the exception — it is reviewable.
6. **Destructive UAT jobs** (`uat-seed` full reset) require explicit confirmation input.
7. **Legacy git branches** (`develop`, `uat`, `release`) are retired — see [P0.8](#p08--retire-legacy-git-branches-develop-uat-release).
8. **Conventional Commits are mandatory** on every merge to `main` — release-please does not guess semver from free-form messages. See [Conventional Commits (required)](#conventional-commits-required-for-release-please).

---

## Conventional Commits (required for release-please)

release-please **only** bumps semver from commit messages on **`main`** since the last release tag:

| Prefix | Version bump | Example |
|--------|--------------|---------|
| `feat:` | **minor** (1.7.0 → 1.8.0) | `feat: returning-family prefill from user_households` |
| `fix:` | **patch** (1.7.0 → 1.7.1) | `fix: fail CI when db push errors on prod deploy` |
| `feat!:` or `BREAKING CHANGE:` in body | **major** | `feat!: require auth to submit registration` |
| `chore:`, `docs:`, `ci:`, `refactor:`, `test:` | **no** user-facing release note by default; may still patch depending on config — use explicit `fix:` / `feat:` when the change is user-visible | `ci: consolidate PR workflows` |

### Squash merge = PR title is the commit message

With trunk-based **`main`**, GitHub **squash merges** are typical: the **PR title** becomes the commit on `main`. That single line must be conventional — body text in the PR description is not enough unless you merge with merge commits or rebase.

**Repo setting (Thomas):** [Settings → General → Pull Requests](https://github.com/tzlukoma/gather-kids/settings) → enable **Allow squash merging**; edit squash message before merge if needed. See [UI cheat sheet](#squash-merge-p05--conventional-commits).

### Agent / human rules (non-negotiable)

1. **PR title** starts with `feat:`, `fix:`, `chore:`, `ci:`, `docs:`, `refactor:`, `test:`, or scoped variants (`feat(register): …`).
2. **Agent-created commits** on the branch use the same format (not `Update file` or `WIP`).
3. **Multi-area PRs:** pick the dominant type or split PRs. Cleanup PR is usually `ci:` or `chore:` unless it ships a user-visible fix.
4. **Breaking changes:** `feat!:` in title or `BREAKING CHANGE:` footer in squash body.
5. **Do not** manually edit `package.json` `version` — release-please Release PR owns that.

### Enforcement (Phase 5 — agent implements)

Persistent repo rules (already in tree — wire CI to match):

| Layer | Location | Blocks merge? |
|-------|----------|----------------|
| Cursor / agents | [`.cursor/rules/conventional-commits.mdc`](../.cursor/rules/conventional-commits.mdc) | N/A — always on |
| Human docs | [`docs/CONTRIBUTING.md`](../CONTRIBUTING.md) | — |
| Commit format | [`commitlint.config.js`](../commitlint.config.js) + `npm run commitlint:branch` | Local optional |
| PR title | `amannn/action-semantic-pull-request` job in `ci.yml` | Yes — required check |
| PR template | [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md) | Reminder only |

**Acceptance:** Open a test PR titled `bad title` → semantic PR check fails; retitle to `ci: test conventional commit lint` → passes.

---

## Current inventory (baseline)

| Workflow | Role today | Action |
|----------|------------|--------|
| `ci.yml` | Jest only on PR | **Replace** with unified CI |
| `ci-db-fk-check.yml` | Migrations + FK on PR/main | **Merge into** `ci.yml` |
| `types-sync.yml` | Types diff check (skips if no secret) | **Replace** with local-Postgres check |
| `generate-types.yml` | Auto-commit types on main | **Delete** or disable auto-commit |
| `gen-supabase-types.yml` | Manual dispatch | **Keep one** dispatch workflow |
| `uat-deploy.yml` | Push to `uat` branch + auto-commit | **Replace** with `uat-db-deploy.yml` dispatch |
| `prod-deploy.yml` | Manual; swallows push failures | **Replace** with fail-fast `prod-db-deploy.yml` |
| `uat-migration-dryrun.yml` | PR to `uat` | **Merge into** PR CI or UAT dispatch dry-run step |
| `e2e-email-tests.yml` | MailHog + dummy Supabase | **Keep**; rename `e2e-email.yml` |
| `uat-seed.yml` | Destructive seed | **Guard** with confirm input |
| `daily-digest.yml` | Scheduled | Top-level under `.github/workflows/`; remove secret logging |
| `supabase-keepalive*.yml` | Scheduled | Top-level under `.github/workflows/` |
| `db-backup.yml`, reports, etc. | Ops | Top-level under `.github/workflows/` |
| `add-pr-to-project`, `close-issue-*` | Automation | Keep as-is |

---

## Phase 0 — Prerequisites (Thomas)

Complete all items before agent kickoff.

> **UI navigation:** GitHub and Vercel move settings often. Use the [Phase 0 UI cheat sheet](#phase-0--ui-cheat-sheet-github--vercel-2026) below for **direct links**, **exact section headings**, and **CLI checks** so you are not hunting outdated menu paths.

---

## Phase 0 — UI cheat sheet (GitHub & Vercel, 2026)

**Repo:** `tzlukoma/gather-kids`

| Task | Where to click | Direct link |
|------|----------------|-------------|
| Actions workflow permissions (release-please) | **Settings → Actions → General** → scroll to **Workflow permissions** | [settings/actions](https://github.com/tzlukoma/gather-kids/settings/actions) |
| Environment secrets (`uat`, `production`) | **Settings → Environments** → click env name → **Environment secrets** | [settings/environments](https://github.com/tzlukoma/gather-kids/settings/environments) |
| Default branch + merge buttons | **Settings → General** → **Default branch** / **Pull Requests** | [settings](https://github.com/tzlukoma/gather-kids/settings) |
| Branch protection (rulesets) | **Settings → Rules → Rulesets** (legacy: **Branch protection rules** under same **Rules** menu) | [settings/rules](https://github.com/tzlukoma/gather-kids/settings/rules) |
| Vercel production branch + env vars | **Project → Settings → Environments** → **Production** / **Preview** | [vercel.com/dashboard](https://vercel.com/dashboard) → your project |

**GitHub sidebar note:** Items live under **Code and automation** (Actions, Branches/Rules, Environments). There is no top-level **Pull Requests** tab — merge options are on **Settings → General**.

---

### release-please: allow Actions to open PRs (P0.5)

This is **not** a separate “create pull requests” page. It is one **checkbox inside Workflow permissions**.

1. Open [github.com/tzlukoma/gather-kids/settings/actions](https://github.com/tzlukoma/gather-kids/settings/actions)
2. In the left sidebar, click **Actions**, then **General** (if General is not visible, you are already on the right page)
3. Scroll past **Actions permissions** and **Fork pull request workflows** until you see **Workflow permissions**
4. Select **Read and write permissions**
5. Check **Allow GitHub Actions to create and approve pull requests**
6. Click **Save**

**If the checkbox is grayed out:** save step 4 first, refresh, try again. On org/enterprise accounts, an owner must enable the same option at org/enterprise **Actions** settings first.

**Verify without the UI:**

```bash
gh api repos/tzlukoma/gather-kids/actions/permissions/workflow
# Want: "default_workflow_permissions": "write"
#       "can_approve_pull_request_reviews": true
# (GitHub’s API name covers both creating and approving PRs from workflows.)
```

---

### Squash merge (P0.5 + Conventional Commits)

1. Open [github.com/tzlukoma/gather-kids/settings](https://github.com/tzlukoma/gather-kids/settings) (**General** tab)
2. Scroll to **Pull Requests**
3. Enable **Allow squash merging** (recommended for trunk-based `main`)
4. Optionally disable **Allow merge commits** / **Allow rebase merging** for a linear history
5. Save if prompted

```bash
gh api repos/tzlukoma/gather-kids --jq '{default_branch, allow_squash_merge, allow_merge_commit, allow_rebase_merge}'
```

---

### GitHub Environments (P0.2)

1. [settings/environments](https://github.com/tzlukoma/gather-kids/settings/environments)
2. Click **`uat`** → **Environment secrets** (add/normalize secrets)
3. Click **`production`** → **Required reviewers** (you) + **Environment secrets**

List secret names (values never shown):

```bash
gh secret list --env uat -R tzlukoma/gather-kids
gh secret list --env production -R tzlukoma/gather-kids
```

---

### Branch protection on `main` (P0.6)

GitHub’s current model is **Rulesets** (not the old standalone “Branches” page).

1. [settings/rules](https://github.com/tzlukoma/gather-kids/settings/rules) → **Rulesets**
2. **New ruleset** → **New branch ruleset**
3. **Target branches:** `main` (or `~DEFAULT_BRANCH` after default branch is `main`)
4. **Branch rules:** Require a pull request before merging; add required status checks **after** Phase 1’s first green CI run (`lint`, `typecheck`, `test`, `build`, `db-fk`, semantic PR title)
5. Remove or disable any ruleset / legacy rule still targeting **`develop`**, **`uat`**, or **`release`**

Legacy UI (if still present): **Settings → Rules → Branch protection rules** → edit/delete old branch entries.

---

### Vercel: production branch + Preview env vars (P0.4)

1. [Vercel Dashboard](https://vercel.com/dashboard) → **gather-kids** project → **Settings**
2. **Environments** (not **Git**) → **Production** → **Branch Tracking** → **`main`** → Save  
   *(If Save fails: set GitHub default branch to `main` first, or disconnect/reconnect Git under **Settings → Git**.)*
3. **Environments → Preview:** UAT Supabase env vars only (never prod keys)
4. **Environments → Production:** prod Supabase env vars
5. Previews: automatic for PRs — confirm with a **Visit Preview** comment on a PR

**Supabase redirect URLs (`*.vercel.app`):** **Skip for CI/CD** unless you test **registration** magic links on PR previews. `/login` has no magic-link UI today; see [P0.4](#p04--vercel--branch--supabase-mapping).

---

### P0.1 — Branch and integration target (trunk-based)

**Do:**

```bash
cd /Users/Thomas/DEV/source_code/_currentProjects/gather-kids
git fetch origin --prune
git checkout main
git pull origin main
git checkout -b chore/ci-cd-cleanup
```

**Record in manifest:** `"integration_branch": "main"` (only long-lived branch).

**Done when:** Branch exists locally, pushed, and **PR will target `main`**.

**Agent validates:** `git branch --show-current` → `chore/ci-cd-cleanup`; manifest `integration_branch` === `"main"`.

---

### P0.2 — GitHub Environments

**Do:** [Settings → Environments](https://github.com/tzlukoma/gather-kids/settings/environments) → verify **`uat`** and **`production`** exist with required reviewers on **production** (you as approver). See [UI cheat sheet](#github-environments-p02).

**Normalize secrets** (add missing; names below are the target — keep old names as aliases during transition if needed):

| Secret | `uat` | `production` | Notes |
|--------|-------|--------------|-------|
| `SUPABASE_URL` | ✓ | ✓ | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or publishable value in same secret | optional | optional | Client key — use **Publishable** key (`sb_publishable_...`) from Dashboard → Settings → API. Legacy anon JWT still works until late 2026. See [`docs/SUPABASE_API_KEYS.md`](../SUPABASE_API_KEYS.md). |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ | Server key — use **Secret** key (`sb_secret_...`), not legacy name required. Same env var name in repo today. |
| `DATABASE_URL` | ✓ | ✓ | Must include `sslmode=require` |
| `SUPABASE_ACCESS_TOKEN` | ✓ | ✓ | CLI link |
| `SUPABASE_DB_PASSWORD` | ✓ | ✓ | DB password for `supabase link` |

**Legacy names still in workflows** (map or duplicate until cleanup merges):

- `UAT_SUPABASE_URL` → `SUPABASE_URL` in uat env
- `PROD_SUPABASE_URL` → `SUPABASE_URL` in production env
- `UAT_DATABASE_URL` → `DATABASE_URL` in uat env
- `PROD_DATABASE_URL` → `DATABASE_URL` in production env

**Done when:** Both environments have `DATABASE_URL`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, project URL, and secret key populated (publishable/secret values in the env var names listed above).

**Agent validates** (requires **gh ≥ 2.5** for `--env`; upgrade with `brew upgrade gh` if needed):

```bash
# Modern gh (recommended)
gh secret list --env uat -R tzlukoma/gather-kids
gh secret list --env production -R tzlukoma/gather-kids

# Works on older gh (names only — values are never shown)
gh api repos/tzlukoma/gather-kids/environments/uat/secrets --jq '.secrets[].name'
gh api repos/tzlukoma/gather-kids/environments/production/secrets --jq '.secrets[].name'
```

(Or confirm manually in GitHub UI → **Settings → Environments → uat / production → Environment secrets** and note in `.ci-local/manifest.json`.)

---

### P0.3 — Local manifest for agent validation

Create **gitignored** `.ci-local/manifest.json` (template committed at [`.ci-local/manifest.example.json`](../.ci-local/manifest.example.json)):

```bash
mkdir -p .ci-local
cp .ci-local/manifest.example.json .ci-local/manifest.json
# Edit placeholders: uat_supabase_project_ref, notify email, etc.
node -e "JSON.parse(require('fs').readFileSync('.ci-local/manifest.json','utf8'))"
```

```json
{
  "integration_branch": "main",
  "vercel": {
    "production_branch": "main",
    "preview_deployments": "all_pull_requests",
    "uat_supabase_project_ref": "your-uat-ref"
  },
  "github": {
    "default_branch": "main",
    "uat_environment": "uat",
    "production_environment": "production",
    "retire_git_branches": ["develop", "uat", "release"]
  },
  "decisions": {
    "trunk_based_main_only": true,
    "pin_node_version": "20",
    "pin_supabase_cli": "2.116.0",
    "delete_generate_types_auto_commit": true,
    "require_ci_checks_on_pr": true,
    "release_branch": "main",
    "conventional_commits_required": true,
    "squash_merge_preferred": true,
    "version_footer_visible_to": "admin"
  },
  "contacts": {
    "notify_on_failed_prod_deploy": "your@email.com"
  }
}
```

**Done when:** File exists and parses.

**Agent validates:** `node -e "JSON.parse(require('fs').readFileSync('.ci-local/manifest.json','utf8'))"`.

---

### P0.4 — Vercel ↔ branch ↔ Supabase mapping

**Do** (Vercel dashboard → Project → Settings):

1. **Environments → Production → Branch Tracking:** set tracked branch to **`main`**  
   *(Vercel moved this out of **Git**; the Git page is now LFS, deploy hooks, verified commits, disconnect.)*
2. **Preview deployments:** no separate toggle required — Vercel creates previews for **non-production branches** and **pull requests** by default ([docs](https://vercel.com/docs/deployments/environments#preview-environment-pre-production)). Confirm by opening a PR and seeing a **Visit Preview** comment.
3. **Environments → Production:** production Supabase env vars only
4. **Environments → Preview:** UAT Supabase env vars — *never* production keys
5. Confirm **Vercel GitHub App** is installed on `tzlukoma/gather-kids`
6. Set **deploy identity env vars:**

| Variable | Vercel Production | Vercel Preview |
|----------|-------------------|----------------|
| `NEXT_PUBLIC_DEPLOY_ENV` | `production` | `uat` |
| `NEXT_PUBLIC_APP_VERSION` | leave empty — from `package.json` at build | same |
| `NEXT_PUBLIC_GIT_SHA` | optional; prefer Vercel system env | same |

**Supabase Auth (optional — usually skip):** Only if you test **registration** magic links on PR preview URLs — add `https://*.vercel.app/**` (UAT Supabase → Authentication → URL Configuration). **`/login` has no magic-link request UI**; password login works without this. See [`docs/MAGIC_LINK_FIX.md`](./MAGIC_LINK_FIX.md).

**Done when:** A test PR shows a Vercel preview link; preview uses UAT Supabase; production deploy on `main` uses prod Supabase.

**Agent validates:** Vercel check on cleanup PR; `/api/version` on preview shows `deployEnv: uat` and UAT project ref.

---

### P0.5 — Release automation (release-please + Conventional Commits)

**Do:** Follow [release-please: allow Actions to open PRs](#release-please-allow-actions-to-open-prs-p05) and [Squash merge](#squash-merge-p05--conventional-commits) in the UI cheat sheet.

1. **Workflow permissions:** Read and write + **Allow GitHub Actions to create and approve pull requests** → Save  
   ([settings/actions](https://github.com/tzlukoma/gather-kids/settings/actions) → **Workflow permissions** section)
2. **Release branch:** `main` (record in manifest `"release_branch": "main"`)
3. **Squash merge:** [Settings → General → Pull Requests](https://github.com/tzlukoma/gather-kids/settings) → enable **Allow squash merging**
4. Read [Conventional Commits (required)](#conventional-commits-required-for-release-please) — **you and every agent** must use `feat:` / `fix:` / `chore:` / `ci:` / `docs:` on PR titles and commits.
5. Record in manifest:

```json
"decisions": {
  "conventional_commits_required": true,
  "squash_merge_preferred": true,
  ...
}
```

**How release-please works (no manual `package.json` bumps):**

- Commits on **`main`** since last tag are parsed for conventional types.
- release-please opens a **Release PR** updating `package.json`, `CHANGELOG.md`, and the version bump.
- Merging the Release PR creates git tag `v1.8.0` and a GitHub Release.
- Vercel production build picks up the new version from `package.json`.

**If commits are not conventional:** release-please may open no Release PR, or only patch `chore:` bumps — changelog will be empty or wrong. **Do not skip the PR title lint in Phase 5.**

**Done when (Thomas — Phase 0 only):** `gh api repos/tzlukoma/gather-kids/actions/permissions/workflow` shows `write` + `can_approve_pull_request_reviews: true`; squash merge enabled; manifest flags recorded; you’ve read the commit prefix table.

**Not expected yet:** `.github/workflows/release-please.yml` does **not** exist until **Phase 5** (agent creates it on `chore/ci-cd-cleanup`). P0.5 is only the GitHub repo settings release-please will need later.

**Agent validates (Phase 5, after implementing):** `.github/workflows/release-please.yml` exists; `ci.yml` includes semantic PR title check; manifest `conventional_commits_required` === `true`.

---

### P0.6 — Branch protection rules

**Do:** [Settings → Rules → Rulesets](https://github.com/tzlukoma/gather-kids/settings/rules) → **New branch ruleset** targeting **`main` only**. See [UI cheat sheet](#branch-protection-on-main-p06).

Required status checks (enable **after** Phase 1 first green CI run — see Phase 7):

- `lint`
- `typecheck`
- `test`
- `build`
- `db-fk`
- **`Conventional PR title`** (semantic-pull-request — required for release-please)

Require PR before merge; dismiss stale reviews optional.

**Remove** rulesets or legacy branch rules for **`develop`**, **`uat`**, and **`release`** (branches deleted in P0.8).

**Done when:** `main` rule exists; legacy branch rules removed or marked for deletion.

**Agent validates:** Default branch is `main`; protection on `main` only.

---

### P0.7 — Supabase CLI version (local)

**Pick one pinned version** for local dev + GitHub Actions. It does **not** configure UAT/prod Supabase cloud or Vercel — those are hosted; only tools that run `supabase` need to match.

**Recommended (Aug 2026):** **`2.116.0`** — current stable on [GitHub releases](https://github.com/supabase/cli/releases) and npm `latest`. Avoid `latest` in CI (workflows today use drifting curl URLs).

**Do:**

1. Check what you have: `supabase --version` (you may see an older build, e.g. `2.40.6`)
2. Upgrade local CLI to the pin:
   ```bash
   brew upgrade supabase          # if installed via Homebrew
   # or: npm install -g supabase@2.116.0
   supabase --version             # should show 2.116.0
   ```
3. Record in **`.ci-local/manifest.json`**: `"pin_supabase_cli": "2.116.0"`

**How it stays consistent everywhere (Phase 2 agent implements):**

| Where | How pin is enforced |
|-------|---------------------|
| **GitHub Actions** | `.github/actions/setup-supabase-cli` + `supabase/setup-cli@v3` with `version: 2.116.0` (from manifest) — replaces curl `.../latest/...` in old workflows |
| **Local (you)** | Same version via Homebrew/npm; run `supabase --version` before migrations |
| **UAT / prod Supabase** | N/A — cloud Postgres; migrations are SQL in `supabase/migrations/` |
| **Vercel** | N/A — app uses `@supabase/supabase-js`, not the CLI |
| **Optional repo lock** | Phase 2 may add `supabase` as a devDependency at `2.116.0` so `npx supabase` matches CI |

**Done when:** Local `supabase --version` matches manifest `pin_supabase_cli`.

**Agent validates:** Composite action installs exact pin; deploy workflow logs `supabase --version` in job summary.

---

### P0.8 — Retire legacy git branches (`develop`, `uat`, `release`)

**Goal:** One trunk — **`main`**. UAT stays as **infrastructure** (Supabase + GitHub Environment + Vercel Preview), not a branch name.

Do this **after** you have merged any unique work into `main`, but **before** or **immediately after** the cleanup PR lands. Order matters: don’t delete until nothing unique remains.

#### Step 1 — Inventory (run locally)

```bash
git fetch origin --prune

for b in develop uat release; do
  echo "=== $b vs main (commits on $b not in main) ==="
  git log --oneline origin/main..origin/$b 2>/dev/null || echo "(branch missing)"
done

echo "=== main vs develop (commits on main not in develop) ==="
git log --oneline origin/develop..origin/main 2>/dev/null | head -20
```

**If any branch shows unique commits:** open a PR **`that-branch` → `main`**, merge, then re-run until empty.

Known repo state (Aug 2026): `main` / `release` were at v1.7.0; `develop` had diverged (Dependabot). **Merge or cherry-pick what you need into `main` first** — do not delete with unmerged work.

#### Step 2 — Merge remaining work into `main`

For each non-empty branch from Step 1:

```bash
git checkout main && git pull origin main
git checkout -b merge/develop-into-main   # or merge/uat-into-main
git merge origin/develop --no-ff           # resolve conflicts; run tests
git push -u origin merge/develop-into-main
```

Open PR → **`main`**. Repeat for `uat`, `release` if needed.

**Agent cleanup PR** (`chore/ci-cd-cleanup`) also targets **`main`**.

#### Step 3 — GitHub default branch

[Settings → General → Default branch](https://github.com/tzlukoma/gather-kids/settings) → **`main`**

If `develop` is still default, switch before deleting `develop`.

#### Step 4 — Vercel branch + preview (confirm, not “develop”)

- **Settings → Environments → Production → Branch Tracking:** **`main`**
- Previews: automatic for PRs / non-`main` branches — verify with a test PR (**Visit Preview**)
- Remove any deploy hook or custom environment branch rule that still targets `develop` or `uat` git branches

#### Step 5 — Delete legacy branch protection

[Settings → Rules → Rulesets](https://github.com/tzlukoma/gather-kids/settings/rules) (and legacy **Branch protection rules** if present) → delete/disable rules for `develop`, `uat`, `release`.

#### Step 6 — Delete remote branches

**Only when** Step 1 shows zero unique commits on each branch:

```bash
git push origin --delete develop
git push origin --delete uat
git push origin --delete release    # if it duplicates main; skip if you use release for something else
```

Optional: create tags before delete for archaeology:

```bash
git tag archive/develop-final origin/develop
git tag archive/uat-final origin/uat
git push origin --tags
```

#### Step 7 — Prune local and notify

```bash
git fetch origin --prune
git branch -d develop uat release 2>/dev/null || true
```

Update README / `docs/CI_CD.md`: “All PRs target **`main`**. Feature branches: `feature/*`, `chore/*`.”

**Done when:**

- Default branch is **`main`**
- Remote **`develop`**, **`uat`**, and **`release`** (if applicable) are deleted
- No workflow triggers on `branches: [uat]` or `branches: [develop]` remain (agent removes in Phases 1–3)
- Manifest lists `"retire_git_branches"` and all are gone from `git branch -r`

**Agent validates:**

```bash
git ls-remote --heads origin develop uat release
# expect no output for deleted branches

rg "branches:.*\\[uat\\]|branches:.*\\[develop\\]" .github/workflows
# expect 0 matches after cleanup
```

---

### P0.9 — Pause destructive UAT automation during cleanup + R1

**Do:** Until R1 completes:

- Do **not** run **`UAT Seed Data`** workflow with reset mode.
- Do **not** restore prod to UAT yet if you plan to do that for R1 — *or* do restore **after** CI cleanup merges so one stable UAT baseline exists.

**Done when:** You acknowledge in manifest or a GitHub Issue comment: “No uat-seed reset until R1 done.”

---

### Phase 0 — Agent validation gate

```bash
test -f .ci-local/manifest.json
gh auth status
npm ci && npm run lint && npm run typecheck && npm test -- --passWithNoTests
```

All must pass locally before Phase 1.

---

## Phase 1 — Unified PR CI (Agent)

**Create/replace** `.github/workflows/ci.yml`:

```yaml
# Jobs (parallel):
#   lint:        npm run lint
#   typecheck:   npm run typecheck
#   test:        npm test
#   build:       npm run build (dummy NEXT_PUBLIC_SUPABASE_*)
#   db-fk:       postgres:15 service, apply supabase/migrations/*.sql, check_fks.sh
#   pr-title:    amannn/action-semantic-pull-request (Conventional Commits — required for release-please)
```

**Requirements:**

- Node **20**, `npm ci` (not `npm install`)
- `permissions: contents: read`
- Triggers: `pull_request` (all branches) + `push` to **`main` only**
- Remove triggers on `develop`, `uat`, `release`
- Upload test/build logs on failure

**Delete or disable:** standalone `ci-db-fk-check.yml` after merge.

**Acceptance:** Open a test PR; all jobs green. PR titled `wip stuff` **fails** semantic title check; retitled `ci: test semantic pull request` **passes**.

---

## Phase 1b — Agent commit discipline (all phases)

Any commit the agent creates during cleanup (and later during R1) **must** follow Conventional Commits:

```
ci: consolidate workflows and add composite actions
feat: add /api/version and footer version badge
fix: fail prod db deploy when supabase push errors
docs: add CI_CD runbook for trunk-based main
chore: retire develop branch triggers from e2e workflow
```

**Squash-merge PR title** for the cleanup PR should be something like:

`ci: streamline CI/CD pipeline for trunk-based main`

Not: `CI/CD cleanup`, `Updates`, or `Fix things`.

---

## Phase 2 — Composite actions (Agent)

**Create:**

`.github/actions/setup-node-app/action.yml`

- checkout (or assume already checked out)
- setup-node@v4, node 20, npm cache
- `npm ci`

`.github/actions/setup-supabase-cli/action.yml`

- inputs: `version` (default from manifest pin)
- install to `$HOME/.bin`, add to PATH
- `supabase --version` step output

Refactor workflows to use these composites (deploy + ops + gen-types dispatch).

**Acceptance:** No duplicated curl/tar blocks in deploy workflows.

---

## Phase 3 — DB deploy workflows (Agent)

### Replace `uat-deploy.yml` → `.github/workflows/uat-db-deploy.yml`

```yaml
on:
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'List migrations only, do not apply'
        type: boolean
        default: false
environment: uat
```

**Steps:**

1. setup-node-app + setup-supabase-cli
2. Extract project ref from `secrets.SUPABASE_URL` (or store `SUPABASE_PROJECT_REF` secret)
3. `supabase link` + apply via existing `scripts/db/apply_migrations_cli.sh` (or `db push --linked`)
4. `check_fks.sh` with `DATABASE_URL`
5. Query and **log to job summary** the latest applied migration:

   ```bash
   psql "$DATABASE_URL" -tA -c \
     "SELECT filename FROM public.schema_migration_ledger ORDER BY applied_at DESC LIMIT 1"
   ```

6. Upload schema snapshot artifact (optional)
7. **No git commit**

**Optional PR helper:** Add job to unified CI that runs `list_unapplied_migrations.sh` against UAT **read-only** on migration path changes — *only if* `UAT_DATABASE_URL` available as repo secret (not env) — otherwise skip with notice.

### Replace `prod-deploy.yml` → `.github/workflows/prod-db-deploy.yml`

- `workflow_dispatch` only
- `environment: production` (required reviewers)
- **Remove** `|| continue` on failed `db push` — job must fail
- Run `ensure_pgcrypto` → migrate → `check_fks.sh` → snapshot artifact
- **No auto-commit types**

### Retire branch-triggered `uat-deploy.yml`

Remove `on.push.branches: [uat]` trigger or delete file.

**Acceptance:** Thomas can run UAT deploy from Actions tab; failure stops the job; FK check runs after apply.

---

## Phase 4 — Types + E2E (Agent)

### Types — one check, one dispatch

**PR check** (in `ci.yml` or `types-check.yml`):

```bash
# After db-fk job applies migrations to local Postgres:
npx supabase gen types typescript --local > supabase-types.ts.new
diff -q src/lib/database/supabase-types.ts supabase-types.ts.new
```

No remote DB secret required on PRs.

**Manual:** Keep **one** `workflow_dispatch` workflow (`gen-supabase-types.yml` simplified) for emergency regen from linked UAT/prod — uploads artifact, optional PR creation via input — **no direct push to main**.

**Delete/disable:** `generate-types.yml` auto-commit on push; redundant `types-sync.yml` remote check.

**Developer docs:** “After adding a migration, run `npm run gen:types` and commit `supabase-types.ts` in the same PR.”

### E2E tiering

| Workflow | Trigger | Scope |
|----------|---------|-------|
| `e2e-email.yml` | PR + push **`main`** | Existing MailHog tests (rename from `e2e-email-tests.yml`) |
| `e2e-smoke.yml` | PR paths: `src/**`, `e2e/**` | Local Supabase + `e2e/smoke-test.spec.ts` using `.env.e2e.ci.example` pattern |

**Do not** add full UAT returning-family e2e to every PR — that belongs in R1 plan Phase 2.

**Acceptance:** PR CI runs smoke when app code changes; email suite still passes.

---

## Phase 5 — Release automation + version visibility (Agent)

Two independent identifiers — never conflate them:

| Identifier | Meaning | Source of truth |
|------------|---------|-----------------|
| **App release** | Deployed code semver | Git tag via release-please → `package.json` at build |
| **DB schema** | Applied migrations | `schema_migration_ledger` (latest by `applied_at`) |
| **Deploy env** | Which tier you’re on | `NEXT_PUBLIC_DEPLOY_ENV` (`uat` / `production` / `preview`) |

### WS5.1 — release-please + PR title enforcement

**Create** `.github/workflows/release-please.yml`:

- Trigger: push to `main`
- Use `googleapis/release-please-action` with `release-type: node`
- Outputs: Release PR bumping `package.json` + `CHANGELOG.md`; tag on merge

**Add to `ci.yml`** (if not done in Phase 1):

```yaml
pr-title:
  name: Conventional PR title
  runs-on: ubuntu-latest
  steps:
    - uses: amannn/action-semantic-pull-request@v5
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        types: |
          feat
          fix
          chore
          ci
          docs
        requireScope: false
```

Add **`pr-title`** to branch protection required checks (P0.6) alongside lint/test/build.

**Optional (local only):** `commitlint.config.js` + husky `commit-msg` hook — document in `docs/CI_CD.md`; not required if PR title lint is enforced.

**Add** root `release-please-config.json` (or manifest in workflow) if needed for monorepo-style paths.

**Add** `CHANGELOG.md` if missing (release-please seeds it).

**Acceptance:** After first merged `feat:` commit to `main`, Release PR appears; merging creates `vX.Y.Z` tag. Non-conventional PR titles fail CI before merge.

### WS5.2 — Build-time app identity

**Create** `src/lib/build-info.ts` (or generate `src/generated/build-info.json` in `prebuild`):

```typescript
export const buildInfo = {
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? process.env.npm_package_version ?? '0.0.0',
  gitSha: (process.env.NEXT_PUBLIC_GIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7),
  gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? 'local',
  deployEnv: process.env.NEXT_PUBLIC_DEPLOY_ENV ?? process.env.VERCEL_ENV ?? 'development',
  builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? '',
};
```

**Update** `package.json` scripts:

```json
"prebuild": "node scripts/inject-build-info.mjs"
```

Script writes `NEXT_PUBLIC_BUILD_TIME` or a checked-in JSON artifact consumed at build (prefer env injection in Vercel only — no commit noise).

**Wire Vercel:** Production and preview projects pass `NEXT_PUBLIC_APP_VERSION` from `$npm_package_version` or leave unset so build reads `package.json`.

**Acceptance:** `npm run build` embeds version; no manual version edits between releases.

### WS5.3 — Runtime `/api/version`

**Create** `src/app/api/version/route.ts`:

- **Build-time fields** from `buildInfo` (app semver, git sha/ref, deployEnv)
- **Runtime DB fields** — one read-only query:

  ```sql
  SELECT filename, applied_at
  FROM public.schema_migration_ledger
  ORDER BY applied_at DESC
  LIMIT 1;

  SELECT count(*) FROM public.schema_migration_ledger;
  ```

- **`supabaseProjectRef`** — parse host from `NEXT_PUBLIC_SUPABASE_URL` (non-secret; confirms UAT vs prod project)
- Graceful fallback if ledger table missing (local dev): `db: { latestMigration: null, appliedCount: 0 }`
- Cache: `Cache-Control: no-store` (must reflect post-migrate state)

**Response shape:**

```json
{
  "app": "1.8.0",
  "gitSha": "a1b2c3d",
  "gitRef": "main",
  "deployEnv": "uat",
  "supabaseProjectRef": "abcd1234",
  "db": {
    "latestMigration": "20250920120000_add_avatar_tables",
    "appliedCount": 68
  }
}
```

**Extend** `/api/health` optional — keep health minimal; version details live on `/api/version` only.

**Acceptance:** `curl /api/version` on local, preview, and prod returns consistent JSON; `db.latestMigration` updates after UAT DB deploy.

### WS5.4 — Footer version badge + tooltip

**Create** `src/components/AppVersionBadge.tsx`:

- Client component; fetches `/api/version` once on mount
- Visible text: `v1.8.0 · uat` (compact)
- Tooltip (Radix `Tooltip`): full app, git, env, Supabase ref, DB migration + count

**Mount in:**

- `src/app/(admin)/layout.tsx` → `SidebarFooter` (staff always see it)
- `src/app/page.tsx` footer (optional — gate by `version_footer_visible_to` in manifest: `admin` | `all`)

For `admin` only on public pages: render badge only when `useAuth()` role is ADMIN or MINISTRY_LEADER.

**Acceptance:** Hover sidebar footer on UAT preview shows app semver **and** DB migration filename; after code deploy without DB migrate, app version bumps but DB migration stays old (expected troubleshooting signal).

### WS5.5 — Troubleshooting playbook (document in CI_CD.md)

| Symptom | Likely cause |
|---------|----------------|
| App version new, DB migration old | Vercel deployed; DB migrate workflow not run |
| DB migration new, app version old | Migrations applied; Vercel not redeployed (usually OK if code unchanged) |
| Same URL, wrong Supabase ref | Vercel env vars point at wrong project |
| Preview PR shows `deployEnv: uat` but prod keys | Vercel Preview env misconfigured |
| Workflow still fires on `uat` branch push | Legacy workflow not removed — check Phase 3 |

**Acceptance:** Section exists in `docs/CI_CD.md`.

---

## Phase 6 — Ops separation + hygiene (Agent)

**Keep at top level** under `.github/workflows/` (GitHub Actions does **not** register workflows in subfolders — an `ops/` subdirectory silently disables them):

```
.github/workflows/daily-digest.yml
.github/workflows/supabase-keepalive.yml
.github/workflows/supabase-keepalive-uat.yml
.github/workflows/db-backup.yml
.github/workflows/ministry-enrollment-report.yml
.github/workflows/check-auth-users.yml
```

> **Correction (Aug 2026):** Phase 6 originally moved these into `ops/`; they were moved back when Daily Digest disappeared from the Actions tab. Do not reintroduce an `ops/` subfolder.

**Guard `uat-seed.yml`:**

```yaml
inputs:
  confirm:
    description: 'Type RESET to allow full reset mode'
    required: true
```

Full reset only if `confirm == 'RESET'`.

**Remove secret logging:**

- `daily-digest.yml`: delete “Debug environment variables” step that prints key prefixes
- `uat-seed.yml`: remove full Supabase URL echo in logs

**Dependabot:** No change (keep weekly; ignore major per PRODUCT_SPEC).

**Acceptance:** Ops workflows are registered in GitHub Actions (visible under the Actions tab); digest does not log secrets.

---

## Phase 7 — Documentation + final validation (Agent)

**Create** `docs/CI_CD.md`:

1. Diagram (copy from this doc)
2. “What runs on every PR”
3. “How releases work” (release-please, **Conventional Commits required**, squash PR titles, no manual package.json)
4. “How to read version footer / `/api/version`” (app vs DB vs env)
5. “How to deploy DB to UAT” (button + expected duration + check footer DB line)
6. “How to deploy DB to prod” (approval flow)
7. “How to run daily digest dry-run”
8. Secret inventory (names only, not values)
9. **Explicit warning:** do not run UAT seed reset during R1

**Update** [`docs/R1_IMPLEMENTATION_PLAN.md`](./R1_IMPLEMENTATION_PLAN.md) preamble: “Start after CI/CD cleanup complete.”

**Agent runs:**

```bash
npm run lint && npm run typecheck && npm test
# Open PR chore/ci-cd-cleanup → verify all CI jobs green
```

**Thomas runs (Phase 8):**

1. Merge cleanup PR to **`main`**
2. Complete [P0.8](#p08--retire-legacy-git-branches-develop-uat-release) if not done pre-merge (delete `develop`, `uat`, `release` git branches)
3. GitHub → set default branch **`main`**; branch protection on **`main`** only
4. `workflow_dispatch` → **UAT DB deploy** (dry-run first, then apply)
5. Confirm Vercel **preview on the merged PR** and **production on `main`** both work
6. Enable branch protection required checks (P0.6)
7. Merge first release-please Release PR when ready (optional — cleanup can ship as `1.7.1` patch)
8. Confirm footer on preview + production shows expected app/db/env lines

---

## Definition of done

- [ ] **Trunk-based:** all PRs target **`main`**; CI triggers on PR + push to `main` only
- [ ] Legacy git branches **`develop`**, **`uat`**, **`release`** retired (remote deleted; no workflow branch triggers)
- [ ] GitHub default branch is **`main`**
- [ ] Vercel previews on PRs (Visit Preview comment); production on `main`
- [ ] Single PR workflow: lint, typecheck, test, build, db-fk all required
- [ ] Node 20 + pinned Supabase CLI via composite action
- [ ] UAT + prod DB deploy are **manual dispatch**, fail-fast, no auto-commit; job summary logs latest migration
- [ ] Types checked on PR against local migrated schema
- [ ] **release-please** on `main`; **semantic PR title** CI check; Conventional Commits documented and enforced
- [ ] No manual `package.json` version bumps
- [ ] **`GET /api/version`** returns app + git + deployEnv + Supabase ref + DB ledger state
- [ ] **Footer badge + tooltip** on admin layout (and public if configured)
- [ ] Ops workflows at `.github/workflows/*.yml` (top level, not `ops/`); digest does not log secrets
- [ ] `uat-seed` full reset requires typing `RESET`
- [ ] `docs/CI_CD.md` exists (includes version troubleshooting table)
- [ ] Branch protection enabled on **`main`** only
- [ ] R1 plan unblocked: agent can open `feature/r1-returning-registration` with confidence in CI

---

## Manual checklist for Thomas (summary)

| # | Task | When |
|---|------|------|
| 1 | Create `chore/ci-cd-cleanup` from **`main`**; PR targets **`main`** | Before agent |
| 2 | Verify GitHub `uat` + `production` env secrets | Before agent |
| 3 | Create `.ci-local/manifest.json` (`integration_branch: main`) | Before agent |
| 4 | Vercel: Environments→Production Branch Tracking=`main`, Preview→UAT Supabase; Vercel GitHub App | Before agent |
| 5 | Actions: [Workflow permissions](https://github.com/tzlukoma/gather-kids/settings/actions) + squash merge on [General](https://github.com/tzlukoma/gather-kids/settings); read Conventional Commits | Before agent |
| 6 | Inventory + merge unique commits from `develop`/`uat`/`release` → `main` | Before or during cleanup |
| 7 | Delete remote `develop`, `uat`, `release` git branches (P0.8) | After merges; before/after cleanup merge |
| 8 | GitHub default branch **`main`**; protection on **`main`** only | After Phase 7 |
| 9 | Avoid UAT seed reset during cleanup/R1 | Ongoing |
| 10 | Merge cleanup PR; run UAT DB deploy once | Phase 8 |
| 11 | Verify Vercel preview link on PR + `/api/version` footer | Phase 8 |
| 12 | Kick off R1 plan Phase 0 (UAT prod restore) | After this doc done |

---

## Appendix — Files the agent will create/modify

| Path | Action |
|------|--------|
| `.github/workflows/ci.yml` | Rewrite (lint, test, build, db-fk, semantic PR title) |
| `commitlint.config.js` | Create — Conventional Commits config |
| `.cursor/rules/conventional-commits.mdc` | Create — always-on agent rule |
| `docs/CONTRIBUTING.md` | Create — commits, PR titles, releases |
| `.github/PULL_REQUEST_TEMPLATE.md` | Update — PR title requirement |
| `.github/copilot-instructions.md` | Update — link to commit conventions |
| `.github/actions/setup-node-app/action.yml` | Create |
| `.github/actions/setup-supabase-cli/action.yml` | Create |
| `.github/workflows/uat-db-deploy.yml` | Create |
| `.github/workflows/prod-db-deploy.yml` | Create |
| `.github/workflows/e2e-smoke.yml` | Create |
| `.github/workflows/daily-digest.yml` (and other ops workflows) | Top-level — do not use `ops/` subfolder |
| `.github/workflows/ci-db-fk-check.yml` | Delete |
| `.github/workflows/uat-deploy.yml` | Delete |
| `.github/workflows/generate-types.yml` | Delete or disable |
| `.github/workflows/types-sync.yml` | Delete |
| `.github/workflows/uat-migration-dryrun.yml` | Delete or retarget to PRs against `main` |
| `.github/workflows/release-please.yml` | Create |
| `release-please-config.json` | Create (if needed) |
| `CHANGELOG.md` | Create or seed |
| `scripts/inject-build-info.mjs` | Create |
| `src/lib/build-info.ts` | Create |
| `src/app/api/version/route.ts` | Create |
| `src/components/AppVersionBadge.tsx` | Create |
| `src/app/(admin)/layout.tsx` | Mount version badge in sidebar footer |
| `docs/CI_CD.md` | Create (trunk-based `main`, Conventional Commits, UAT-as-environment) |
| `docs/R1_IMPLEMENTATION_PLAN.md` | Update branch references to `main` |

---

## Appendix — What stays out of scope

- Vercel deployment changes inside GitHub Actions (except env vars for version/deploy identity)
- Cross-environment dashboard querying all three `/api/version` URLs at once (nice-to-have later)
- Sentry release tagging (easy follow-up once semver tags exist)
- Demo env versioning ([#241](https://github.com/tzlukoma/gather-kids/issues/241)) — add `deployEnv: demo` when that project exists
- Next.js 16 / Zod 4 Dependabot majors
- RLS or security issue fixes (#183, #184, #194) — R2
- Full returning-family Playwright in CI — R1
- Production Fall 2026 cycle activation — R1 Phase 4

---

*Last updated: 30 August 2026 (Phase 0 UI cheat sheet; GitHub Rulesets + Actions workflow permissions; Vercel Environments branch tracking)*
