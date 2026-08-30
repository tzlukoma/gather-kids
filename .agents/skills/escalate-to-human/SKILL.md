---
name: escalate-to-human
description: >
  Decision-ready GitHub escalation for gatherKids. Use when blocked on a
  material product, security, data, production, or scope decision and
  Thomas (@tzlukoma) must choose.
---

# Human-input escalation

Follow [`AGENTS.md`](../../../AGENTS.md). Escalate only for material decisions listed there. Do not ask Thomas to pick a routine implementation.

GitHub is the only inbox. Do not DM, do not rely on Cursor/Claude/Codex/Copilot dashboards, and do not post reminder comments.

## Canonical signal

1. Stop work that the decision would invalidate.
2. Apply `agent:needs-input` (and keep `agent:managed`).
3. Move the Project item to **Needs Thomas** when permitted.
4. Post **one** structured comment mentioning `@tzlukoma`.
5. Leave the PR in **draft**.
6. Wait.

If labels or Project fields cannot be updated, still do steps 1, 4, and 5, and ask Thomas to apply the label and status.

## Comment template

Post this on the **issue** (and on the PR if one exists). Do not omit options or a recommendation.

```markdown
## ⛔ Human input required

@tzlukoma

### Decision needed

State the single decision or missing piece of information.

### Why work cannot safely continue

Explain the conflict, ambiguity, risk or missing permission.

### Options

1. **Option A — Recommended:** Describe the option and its consequence.
2. **Option B:** Describe the alternative and its consequence.
3. **Option C, if applicable:** Describe the alternative.

### Recommendation

State which option the agent recommends and why.

### Work completed

- Investigation or implementation completed
- Branch or draft PR
- Tests currently passing
- Relevant files or documentation

### Impact of waiting

State whether any independent work can continue safely.

### To resume

Ask for the smallest possible response, for example:

- “Approve Option A”
- “Use registrations plus enrolments”
- “Split this into separate PRs”
- “Defer the schema change”
```

Do not post a vague question such as “How would you like me to proceed?” without researching the issue and presenting a recommendation.

Combine related questions into this one comment. Ask **one** principal decision at a time.

## Labels

```bash
gh issue edit <n> --add-label "agent:needs-input"
# later, after Thomas answers:
gh issue edit <n> --remove-label "agent:needs-input"
```

Other labels:

- `agent:managed` — issue is assigned to an agent
- `agent:review-ready` — draft PR is ready (not used while blocked)

## Project field IDs (gatherKids Roadmap)

Project: [gatherKids Roadmap](https://github.com/users/tzlukoma/projects/7) (`PVT_kwHOADGsxM4BB0Jz`)

Status field `PVTSSF_lAHOADGsxM4BB0Jzzg0NcCw`:

| Status | Option id |
|--------|-----------|
| Backlog | `f75ad846` |
| Ready for Agent | `d178a03b` |
| Agent Working | `47fc9ee4` |
| Needs Thomas | `8f6b391f` |
| PR Review | `d111807d` |
| Done | `98236657` |
| On Hold | `c2a861f3` |

Agent field `PVTSSF_lAHOADGsxM4BB0Jzzhg1cPI`: Cursor `d9c19220`, Copilot `91796f78`, Codex `48609a73`, Claude `c59e3357`, Human `eb33e324`.

Risk field `PVTSSF_lAHOADGsxM4BB0Jzzhg1cPU`: Low `3403f598`, Medium `c87a97dc`, High `84e38e7c`.

```bash
# Resolve the item id, then:
gh project item-edit \
  --id <ITEM_ID> \
  --project-id PVT_kwHOADGsxM4BB0Jz \
  --field-id PVTSSF_lAHOADGsxM4BB0Jzzg0NcCw \
  --single-select-option-id 8f6b391f
```

If this fails with a permission error, write in the comment: “Please move this to **Needs Thomas** on the Roadmap. I could not update the Project field.”

## State transitions

```text
Backlog
  → Ready for Agent
  → Agent Working
  → Needs Thomas, when blocked
  → Agent Working, after Thomas responds
  → PR Review
  → Done
```

Agents never move an item to **Done** unless the issue was documentation-only and Thomas authorised closure.

## While blocked

- Do not post reminders, pings, or “just checking in”.
- Continue only independent work that cannot be invalidated by the pending decision.
- Keep the PR draft.

## Resume after Thomas responds

1. Acknowledge the decision in **one** comment (quote the choice).
2. Remove `agent:needs-input`.
3. Move status to **Agent Working**.
4. Implement the chosen option. Do not reopen the decision.
5. When complete, follow [pr-evidence](../pr-evidence/SKILL.md).

### How resume is triggered (tool-specific)

GitHub is still the source of the decision. The coding session may need a retrigger:

| Tool | What Thomas does after commenting on GitHub |
|------|-----------------------------------------------|
| Cursor | Start or resume a Cursor agent with the issue URL and the chosen option. There is no automatic GitHub → Cursor wake-up. |
| GitHub Copilot coding agent | Comment `@github-copilot` on the issue/PR asking it to continue with the chosen option, or use the PR’s Copilot session. |
| Codex | Resume the Codex task / comment on the PR with the decision. |
| Claude Code | Paste the GitHub decision into the existing session, or start a new session with the issue URL and the chosen option. |

If the platform requires an extra mention to resume, Thomas’s GitHub comment should include that mention. Agents must document the exact next step in **To resume**.

## Worked example (material ambiguity)

Issue asks to “show last year’s enrolment on the household page” but does not define which cycle is “last year” (production cycle ids are UUIDs).

- Stop implementing the cycle-selection rule.
- Apply `agent:needs-input`, status **Needs Thomas**.
- Options might be: (A) newest cycle with `is_active`, (B) cycle whose date range contains today minus one year, (C) split cycle selection into a follow-up issue and ship UI chrome only.
- Recommend A or B with evidence from `docs/PRODUCT_SPEC.md` and current DAL helpers.
- Do not invent `parseInt(cycle_id) - 1`.
