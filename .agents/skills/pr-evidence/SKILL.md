---
name: pr-evidence
description: >
  Draft PR evidence checklist and handoff for gatherKids agent work. Use
  when opening or updating a draft pull request.
---

# PR evidence and handoff

Follow [`AGENTS.md`](../../../AGENTS.md). Completed work is a **draft** PR in **PR Review**, not a merge.

## Title

Conventional Commits. The squash merge uses this title:

```text
feat(register): prefill household from user_households after login
fix: fail prod db deploy when supabase push errors
docs: document trunk-based main in CI_CD.md
chore: remove unused script
```

Link the issue (`Fixes #n` or `Refs #n`). Do not rename the title later for “status updates”.

## Body checklist

Copy into the PR (also in [`.github/PULL_REQUEST_TEMPLATE.md`](../../../.github/PULL_REQUEST_TEMPLATE.md)):

```markdown
## Summary

- Linked issue:
- What changed and why:

## Checklist

- [ ] Linked issue and concise change summary
- [ ] Scope matches the issue; unrelated work excluded
- [ ] Commands run with exact pass/fail results
- [ ] Relevant unit, integration or E2E coverage added or updated
- [ ] UI screenshots or recordings attached, or marked not applicable
- [ ] Accessibility and responsive behaviour checked where applicable
- [ ] Schema/migration impact documented, or marked none
- [ ] Generated Supabase types updated or verified where applicable
- [ ] Auth, RLS, role, household and ministry-scope impact documented
- [ ] Secrets and sensitive child/guardian data reviewed
- [ ] Environments accessed or modified explicitly listed
- [ ] Rollback or forward-fix approach documented
- [ ] Outstanding manual verification clearly listed
- [ ] Known risks, limitations and follow-up work listed
- [ ] No production mutation, deployment, merge, reset or seeding performed
- [ ] PR remains in draft status
- [ ] Project status moved to `PR Review`
- [ ] `agent:review-ready` applied, when permitted
- [ ] Thomas requested as reviewer or mentioned in the handoff
```

Fill every item. Use **N/A** with a reason rather than deleting a line.

## Commands section

Paste the exact commands from [verify-change](../verify-change/SKILL.md). Include skipped checks.

## After the PR exists

When permitted:

```bash
gh pr ready <n>           # DO NOT run — stay in draft
gh pr merge               # DO NOT run
gh pr edit <n> --add-reviewer tzlukoma
gh pr edit <n> --add-label "agent:review-ready"
gh issue edit <issue> --add-label "agent:review-ready"
gh issue edit <issue> --remove-label "agent:needs-input"
```

Move the **issue** to **PR Review**. The PR card may already be there from `add-pr-to-project.yml`.

Mention `@tzlukoma` in the PR body or a single handoff comment if you cannot request review.

## Do not

- Mark the PR ready for review.
- Merge.
- Mark the Project item **Done**.
- Include secrets, env file contents, or real family data (including screenshots).
