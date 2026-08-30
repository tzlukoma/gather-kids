# gatherKids — GitHub coding agent adapter

Follow [`AGENTS.md`](../AGENTS.md) as the canonical operating contract.

Procedures: [`.agents/skills/`](../.agents/skills/). Human workflow: [`docs/AGENT_WORKFLOW.md`](../docs/AGENT_WORKFLOW.md).

This file adds GitHub Copilot / coding-agent **mechanics** only. It must not override safety, environment, or escalation rules in `AGENTS.md`.

Always read `AGENTS.md` first. Use repository search or shell only when something here disagrees with executable truth (`package.json`, source, `.github/workflows/`).

## Working effectively

- Install: `npm ci` — often ~60s. NEVER CANCEL. Set timeout to 5+ minutes.
- Dev server: `npm run dev` — port **9002**, not 3000. NEVER CANCEL.
- Production build: `npm run build` — often ~30s+. NEVER CANCEL. Set timeout to 2+ minutes.
- Tests: `npm test -- --passWithNoTests` — set timeout to 60+ seconds.
- Typecheck: `npm run typecheck`.
- Lint: `npm run lint` (required CI job; `.eslintrc.json` already exists — do not re-run first-time ESLint setup).
- Node in CI: **20**.

Dummy Supabase values are enough for `next build` in CI. Do not put real keys in the repo.

## Commits and PRs

Use [Conventional Commits](https://www.conventionalcommits.org/) for every commit and the PR title. See [`docs/CONTRIBUTING.md`](../docs/CONTRIBUTING.md).

- Draft PRs only. Do not merge.
- Include the issue reference (`Fixes #n`).
- Do not rename the PR title as you post updates.
- Evidence checklist: [`.agents/skills/pr-evidence/SKILL.md`](../.agents/skills/pr-evidence/SKILL.md).

## Patterns still in force

- Data fetching and mutations go through React Query. See [`docs/REACT_QUERY_STANDARDS.md`](../docs/REACT_QUERY_STANDARDS.md).
- UI data flows through the DAL. Do not import `@supabase/supabase-js` from UI (ESLint `no-restricted-imports`).
- Avoid introducing `any` in new source. Prefer `unknown` plus a guard. If a temporary `any` is unavoidable, comment why and link `.github/ISSUES/000-temp-relax-no-explicit-any.md`.
- DAL/DTO field names are `snake_case`.

## Do not trust stale copies of this file

The following former claims in older Copilot notes are **false** relative to current `main`. `AGENTS.md` and executable code win:

- Auth is **Supabase Auth**, not a demo-only custom context.
- Runtime storage is **Supabase**, not IndexedDB/Dexie.
- Jest coverage is far larger than “83 tests in 14 suites”.
- `npm run lint` is a required CI check, not an expected exit 1.

## Escalation

Blocked material decisions go to GitHub with `@tzlukoma` and `agent:needs-input`. See [`.agents/skills/escalate-to-human/SKILL.md`](../.agents/skills/escalate-to-human/SKILL.md).
