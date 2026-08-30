---
name: implement-ticket
description: >
  Take a gatherKids GitHub issue from assignment to a draft PR without
  merging or deploying. Use when implementing an issue, starting agent
  work, or continuing after Thomas responds.
---

# Safe ticket implementation

Follow [`AGENTS.md`](../../../AGENTS.md). This procedure does not override it.

## 1. Confirm the issue is still valid

```bash
git fetch origin main
git log --oneline origin/main -10
gh issue view <n> --repo tzlukoma/gather-kids
```

Stop and escalate if:

- The issue is already implemented, stale, or superseded.
- Acceptance criteria conflict with current `main`.
- The work is substantially larger than the issue suggests.
- Production operations would be required.

## 2. Identify dependencies and risk before editing

- Read neighbouring code and tests, not only the issue text.
- Note schema, auth/RLS, household/ministry-scope, and environment impact.
- Set Project **Risk** to Low, Medium, or High when permitted.
- Set Project **Agent** to Cursor, Copilot, Codex, Claude, or Human.

If you cannot edit Project fields, say so once in the first progress comment.

## 3. Resolve routine discrepancies with the decision hierarchy

Use the order in `AGENTS.md`. Follow executable repository truth over stale docs. Record the discrepancy in the PR. Update stale docs only when that is safely in scope.

Do not ask Thomas to make routine, reversible implementation choices.

## 4. Stay inside the issue

- One coherent concern.
- No opportunistic refactors.
- No unrelated schema + auth + UI + ops mix.
- If handwritten changes will exceed ~500 lines or the issue hides several concerns, stop and propose sub-issues.

## 5. Branch and status

```bash
git checkout -b <type>/<short-name> origin/main
```

`<type>` is `feat`, `fix`, `chore`, `docs`, `ci`, `refactor`, or `test`.

When permitted:

```bash
gh issue edit <n> --add-label "agent:managed"
```

Move the **issue** to **Agent Working**. Exact Project field commands are in [escalate-to-human](../escalate-to-human/SKILL.md).

## 6. Implement

- Prefer the smallest change that matches existing patterns.
- Use synthetic fixtures only.
- After schema changes, follow [database-migration-safety](../database-migration-safety/SKILL.md).
- After code changes, follow [verify-change](../verify-change/SKILL.md).

## 7. Draft PR only

Create the draft PR when the evidence checklist can be filled in. Opening a PR auto-adds the *PR* card at **PR Review**; keep the *issue* in **Agent Working** until the checklist is complete.

```bash
gh pr create --draft --title "<type>: <description>" --body-file <path>
```

Do not merge. Do not mark the PR ready for review.

Handoff: [pr-evidence](../pr-evidence/SKILL.md).

## 8. CI repair limit

At most **two** focused CI-repair attempts for failures introduced by this PR.

After two attempts, escalate with logs, what you tried, and a recommendation. Do not keep pushing speculative fixes.

## 9. While waiting for input

Continue independent work only when the pending decision cannot invalidate it. Do not guess the blocked decision. Do not post reminder comments.

## 10. Never

- Merge, deploy, or operate UAT/production.
- Reset or seed shared environments unless the issue explicitly authorises that named workflow.
- Mark the item **Done**.
