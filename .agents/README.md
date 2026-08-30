# Agent skills (tool-neutral)

Canonical procedures for coding agents. Every supported tool should follow [`AGENTS.md`](../AGENTS.md) and these skills instead of maintaining a second copy of the operating contract.

## Why `.agents/skills/`

- **Tool-neutral.** Cursor, Claude Code, Codex, and GitHub coding agents can all read a path that is not owned by one vendor (`.cursor/`, `.claude/`, `.github/copilot-instructions.md`).
- **Discoverable from `AGENTS.md`.** Root `AGENTS.md` is the file those tools already load.
- **Thin adapters stay thin.** Cursor rules, `CLAUDE.md`, and Copilot instructions point here; they do not duplicate the procedures.

Claude’s Playwright runner remains at [`.claude/skills/e2e/SKILL.md`](../.claude/skills/e2e/SKILL.md) because it encodes Claude Code worktree mechanics.

## Skills

| Skill | Use when |
|-------|----------|
| [implement-ticket](skills/implement-ticket/SKILL.md) | Taking a GitHub issue to a draft PR |
| [verify-change](skills/verify-change/SKILL.md) | Choosing and reporting verification |
| [database-migration-safety](skills/database-migration-safety/SKILL.md) | Schema, SQL, or generated types |
| [pr-evidence](skills/pr-evidence/SKILL.md) | Draft PR handoff |
| [escalate-to-human](skills/escalate-to-human/SKILL.md) | Material decision required |
