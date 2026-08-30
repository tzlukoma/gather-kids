# Claude Code adapter

Follow [`AGENTS.md`](AGENTS.md) as the canonical gatherKids operating contract.

Procedures live in [`.agents/skills/`](.agents/skills/). Do not copy or override safety, environment, or escalation rules from `AGENTS.md`.

## Claude-specific only

- Playwright setup for this machine/worktree: [`.claude/skills/e2e/SKILL.md`](.claude/skills/e2e/SKILL.md)
- Bash allow/ask lists: [`.claude/settings.json`](.claude/settings.json)

`gh pr create` is an ask permission. Creating a **draft** PR is required by the contract; merging is forbidden even if eventually allowed.

When blocked, post the escalation on GitHub mentioning `@tzlukoma`. Do not wait in the Claude session for a decision that never appears on the issue.
