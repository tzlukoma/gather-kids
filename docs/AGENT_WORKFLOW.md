# Working with coding agents

How Thomas uses GitHub as the only inbox for Cursor, Copilot, Codex, Claude Code, and future coding agents.

Canonical agent rules: [`AGENTS.md`](../AGENTS.md). This document is the **human** side of that contract.

Project: [gatherKids Roadmap](https://github.com/users/tzlukoma/projects/7)

| Queue | View | Meaning |
|-------|------|---------|
| **Needs My Input** | [view 5](https://github.com/users/tzlukoma/projects/7/views/5) | Agent is blocked on a decision |
| **Ready to Review** | [view 6](https://github.com/users/tzlukoma/projects/7/views/6) | Draft PR is waiting on Thomas |
| Agent Working | [view 7](https://github.com/users/tzlukoma/projects/7/views/7) | Diagnose unusually long-running work |

Do not monitor full agent transcripts as the primary workflow. Mentions, review requests, and these two queues are enough.

## What is safe to assign

An issue is suitable for autonomous implementation when:

- Acceptance criteria are explicit and match current product behaviour.
- Scope is one coherent concern (roughly one reviewable PR).
- No unresolved registration-cycle, enrolment, permission, retention, or data-ownership rule.
- No production query, mutation, deploy, or secret change is required.
- Fixtures can be synthetic.

Keep **human-led** (or split first) when:

- The ticket would change user-visible product rules.
- Auth, RLS, privilege, or sensitive-data visibility is ambiguous.
- Schema is destructive or privilege-changing.
- The work mixes unrelated schema, auth, UI, and operations.
- The issue is stale, already done, or clearly larger than one PR.
- Shared UAT reset/seed or production operations are involved.

Mentioning production in an issue does **not** authorise production operations.

## How to assign

1. Put the issue in **Ready for Agent**.
2. Set **Agent** (Cursor, Copilot, Codex, Claude, or Human) and **Risk**.
3. Apply `agent:managed` if you want the label visible on the issue.
4. Point the agent at the issue URL. Expected output: a **draft** PR with the evidence checklist, or one decision-ready escalation.

Do not expect merge, deploy, or a **Done** status from the agent.

## How to review a draft PR

Use [Ready to Review](https://github.com/users/tzlukoma/projects/7/views/6) and the checklist in [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md).

Confirm:

- Scope matches the issue.
- Commands listed actually cover the change type.
- No secrets or real family data.
- Auth/RLS/household/ministry impact is honest.
- PR is still draft; you merge (or request changes).

A second AI reviewer is justified when the diff touches authentication, RLS, privilege, migrations, or child/guardian data visibility. Ordinary UI copy and docs usually do not need it.

## Blocked, stale, oversized

| Situation | What you do |
|-----------|-------------|
| **Needs My Input** | Answer with the smallest response the comment asked for (“Approve Option A”). Agents must not nag; if they do, treat it as a contract violation. |
| Stale / already done | Comment to close or convert to docs-only; do not leave the agent guessing. |
| Oversized | Split into sub-issues; leave the original in **On Hold** or **Backlog**. |
| Agent Working too long | Open [Agent Working](https://github.com/users/tzlukoma/projects/7/views/7). If there is no PR and no escalation, inspect the branch/session once, then ask the agent to escalate or stop. |

## Resume after you answer

Comment on the **GitHub issue or PR** first. Then wake the tool if it does not resume on its own:

| Agent | Resume |
|-------|--------|
| Cursor | New or resumed Cursor agent with the issue URL and your chosen option. GitHub does not wake Cursor. |
| Copilot coding agent | `@github-copilot` on the issue/PR with the decision, or the PR Copilot session. |
| Codex | Resume the Codex task / comment on the PR. |
| Claude Code | Paste your GitHub comment into the session, or start a new session with the issue URL. |

After resume, the agent should move the item back to **Agent Working**, then to **PR Review** when the checklist is complete.

## Labels and fields (already configured)

Labels: `agent:managed`, `agent:needs-input`, `agent:review-ready`.

Project fields: **Status** (including Needs Thomas / PR Review), **Agent**, **Risk**. **On Hold** remains available for human use; agents should not use it as a substitute for **Needs Thomas**.

If an agent cannot edit the Project, their comment plus `@tzlukoma` plus `agent:needs-input` is still valid. Move the card yourself.

## GitHub notification setup (manual)

Personal GitHub settings cannot be changed from the repo. Configure these locally:

- [ ] GitHub Mobile push notifications for **direct mentions**
- [ ] Push notifications for **pull request review requests**
- [ ] Notifications for **issue or PR assignments**
- [ ] Notifications for **deployment approval** (UAT/production GitHub Environments)
- [ ] Avoid watching every issue and PR on `gather-kids` (too much noise)
- [ ] Treat `@tzlukoma` mentions and review requests as the high-signal path

You should be able to run the project by checking **Needs My Input** and **Ready to Review** plus GitHub Mobile mentions — not by reading raw agent logs.
