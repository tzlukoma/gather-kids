---
name: git-worktree
description: >
  Create a gatherKids git worktree before starting new work, and remove
  it after the PR from that worktree is merged. Use when starting a
  ticket, opening a new agent session, or cleaning up after a merge.
---

# Git worktrees

Follow [`AGENTS.md`](../../../AGENTS.md). New work is implemented in a worktree, never on the primary checkout.

The primary checkout is the clone that tracks `main` (typically `gather-kids/`). Leave it on `main`. Do not create feature branches or commit there.

## 1. Before starting new work

```bash
git fetch origin main
git worktree list
gh pr list --repo tzlukoma/gather-kids --state merged --limit 20
```

Remove any leftover worktree whose PR is already merged (section 4). Then create a new worktree for this ticket.

## 2. Create the worktree

```bash
git fetch origin main
mkdir -p .worktrees
git worktree add -b <type>/<short-name> .worktrees/<short-name> origin/main
```

`<type>` is `feat`, `fix`, `chore`, `docs`, `ci`, `refactor`, or `test`.

`<short-name>` is a short slug (issue number plus topic is fine, for example `391-household-prefill`).

If the tool already created an isolated worktree (Cursor worktree, `.claude/worktrees/…`, cloud coding-agent clone), use that directory. Do not nest another `git worktree add` inside it.

After the worktree exists:

- Continue the rest of the ticket **inside** that directory.
- Cursor: move the agent root to the worktree before the first edit.
- Do not `cd` back to the primary checkout to implement, commit, or open the PR.

Local env files stay untracked. Copy or symlink `.env.local` from the primary checkout only when the change needs to run the app. Never commit env files.

## 3. While the PR is open

Leave the worktree in place. Use it for review fixes and CI repairs.

Do not remove a worktree that still has an open PR, uncommitted work you still need, or a branch that has not landed on `main`.

## 4. After the PR is merged

Agents must not merge. When you learn the PR merged (Thomas merged it, a later session, or the start of the next ticket):

```bash
gh pr view <n> --repo tzlukoma/gather-kids --json state,mergedAt,headRefName
```

Proceed only when `state` is `MERGED`.

```bash
git worktree remove .worktrees/<short-name>
git worktree prune
```

If `git worktree remove` refuses because of untracked files (`node_modules`, `.next`, local env), that is expected after a merged PR. Then:

```bash
git worktree remove --force .worktrees/<short-name>
git worktree prune
```

`--force` is only for a **merged** PR’s leftover generated or env files. Do not use it to throw away uncommitted work on an open PR.

If the tool created the worktree at another path, remove that path instead:

```bash
git worktree list
git worktree remove <path>
git worktree prune
```

Deleting the branch on the remote is optional and not required. Do not delete `main` or the primary checkout.

## 5. Never

- Implement or commit on the primary checkout.
- Share one worktree across unrelated issues.
- Leave a merged worktree on disk “for later”.
- `git worktree remove --force` an open PR’s worktree.
- Reset, clean, or delete someone else’s worktree without checking `git worktree list` and the PR state.
