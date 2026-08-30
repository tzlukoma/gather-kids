## Pull request title (required)

Use [Conventional Commits](https://www.conventionalcommits.org/) — the PR title becomes the squash commit on `main` and drives release-please semver:

```
feat(register): prefill household from user_households
fix: fail prod db deploy when supabase push errors
docs: add agent contract
```

CI blocks non-conventional titles. See [`docs/CONTRIBUTING.md`](../docs/CONTRIBUTING.md) and [`AGENTS.md`](../AGENTS.md).

---

## Summary

- Linked issue:
- What changed and why:

## Agent evidence checklist

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

Commands (paste exact results):

```text

```

## DAL / registration PRs (additional)

When the diff touches registration, DTOs, or the data layer:

- [ ] Ran **types regen** (`npm run gen:types`) and committed diff if schema changed
- [ ] **DAL contract** tests pass (`npm test -- contracts/registration.contract.test.ts`)
- [ ] **snake_case guard** passes (`npm test -- contracts/casing.guard.test.ts`)
- [ ] **Enum sync** tests pass (`npm test -- contracts/enum-sync.test.ts`)
- [ ] No direct DB imports outside DAL (ESLint passes)
- [ ] New DTOs use **snake_case**; UI data flows through **DAL/dbAdapter**

Details: [`.agents/skills/pr-evidence/SKILL.md`](../.agents/skills/pr-evidence/SKILL.md)
