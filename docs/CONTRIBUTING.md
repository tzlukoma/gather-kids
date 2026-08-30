# Contributing to gatherKids

## Branching

- **Trunk-based:** one long-lived branch, **`main`**
- Feature work: `feature/*`, `chore/*`, `fix/*` → **PR → `main`**
- **UAT** is a Supabase project + GitHub Environment + Vercel Preview — not a git branch

See [`docs/CI_CD.md`](./CI_CD.md) (added during CI/CD cleanup) for deploy and release flow.

## Commits and pull requests

We use **[Conventional Commits](https://www.conventionalcommits.org/)** on every commit and **PR title**. [release-please](https://github.com/googleapis/release-please) reads squash-merge commits on `main` to bump semver and write `CHANGELOG.md`.

### PR title (required)

Start with a type prefix:

```
feat: add version badge to admin sidebar footer
fix: require auth before registration submit
ci: consolidate GitHub Actions workflows
docs: add CONTRIBUTING guide for conventional commits
```

CI runs [`amannn/action-semantic-pull-request`](https://github.com/amannn/action-semantic-pull-request) — non-conventional PR titles fail the check.

### Commit messages (required for agents and recommended for humans)

Use the same format on each commit on your branch. If you squash-merge, the **PR title** is what lands on `main`.

| Type | Semver impact (typical) |
|------|-------------------------|
| `feat` | minor |
| `fix` | patch |
| `feat!` or `BREAKING CHANGE:` | major |
| `chore`, `ci`, `docs`, `refactor`, `test` | no user-facing release note by default |

### Breaking changes

```
feat!: require login to submit registration form

BREAKING CHANGE: unauthenticated /register submit is no longer allowed
```

### Do not manually bump `package.json` version

Merge the **release-please Release PR** when it appears. That updates `package.json`, `CHANGELOG.md`, and creates the git tag.

## Local validation (optional)

```bash
# Validate a single message (header only — what you type for squash PR title)
echo "feat: my change" | npx commitlint

# Validate only the latest commit on your branch
npm run commitlint:last

# Validate every commit since origin/main (includes Dependabot merges on main)
npm run commitlint:branch
```

`commitlint:branch` walks **all** commits between `origin/main` and `HEAD`. That includes Dependabot merge commits on `main` — their **headers** are fine (`chore(deps): …`); we disable `body-max-line-length` because bot bodies contain wide markdown tables.

For day-to-day work, prefer `echo "…" | npx commitlint` or `commitlint:last` before pushing.

Config: [`commitlint.config.js`](../commitlint.config.js)

## User guide (`/help`)

Edit markdown under `content/help/`. Validate with `npm run docs:validate`. Capture screenshots only from local seeded data (`npm run help:capture-screenshots`). See [`docs/HELP_DOCS.md`](./HELP_DOCS.md).

## Cursor / AI agents

Canonical contract: [`AGENTS.md`](../AGENTS.md). Procedures: [`.agents/skills/`](../.agents/skills/). Human inbox: [`docs/AGENT_WORKFLOW.md`](./AGENT_WORKFLOW.md).

Project rule for commits: [`.cursor/rules/conventional-commits.mdc`](../.cursor/rules/conventional-commits.mdc) (`alwaysApply: true`). Cursor also loads [`.cursor/rules/agent-contract.mdc`](../.cursor/rules/agent-contract.mdc), which points at `AGENTS.md`.

Do not copy the operating contract into tool-specific files. Claude: [`CLAUDE.md`](../CLAUDE.md). Copilot: [`.github/copilot-instructions.md`](../.github/copilot-instructions.md).

## Code conventions (registration / DAL)

For registration and data-layer work, also follow the PR checklist in [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md).
