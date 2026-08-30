---
name: database-migration-safety
description: >
  Safe gatherKids schema and Supabase type changes. Use when adding or
  editing SQL migrations, generated types, RLS, or database scripts.
---

# Database migration safety

Follow [`AGENTS.md`](../../../AGENTS.md). Agents prepare migrations. They do not apply them to UAT or production.

## Before editing

1. List existing files in `supabase/migrations/` and match naming (`YYYYMMDDHHMMSS_description.sql`).
2. Read neighbouring migrations for patterns (additive columns, enums, grants).
3. Read current `src/lib/database/supabase-types.ts` and DAL types in `src/lib/database/`.
4. Check `docs/PRODUCT_SPEC.md` for known RLS and data-ownership gaps. Do not copy unsafe access patterns.

## Prefer additive changes

- Add columns/tables/indexes rather than renaming or dropping in the same PR when possible.
- Avoid `DROP`, `TRUNCATE`, destructive `UPDATE`s, and privilege grants that widen access.
- Keep UI and DAL compatible with both the old and new schema until production migrate is a separate, human-run step.

Human review is **required** before any migration that is destructive, changes privileges/RLS, or only makes sense if applied to production immediately. Escalate rather than shipping that in an agent PR unless the issue already authorised it.

## Local validation

Disposable local stack only:

```bash
supabase start          # or supabase db reset on local
# add migration:
supabase migration new name_of_change
npm run gen:types
npm run typecheck
npm test -- --passWithNoTests
```

Commit `src/lib/database/supabase-types.ts` when it changes.

CI will apply all `supabase/migrations/*.sql` to ephemeral Postgres 15 and run `scripts/db/check_fks.sh` plus `scripts/db/check_types_sync.sh`. You cannot skip that by generating types from production.

## Type generation boundaries

| Command | Allowed? |
|---------|----------|
| `npm run gen:types` (local Supabase) | Yes, after local schema work |
| `npm run gen:types:prod` / remote project id | No against production. Do not use UAT for this unless the issue explicitly says so |
| Editing `supabase-types.ts` by hand | No, except to match a just-generated local diff you understand |

## Shared environments — prohibited

- Do not `supabase db push` / `migration up` against UAT or production.
- Do not run [`uat-db-deploy.yml`](../../../.github/workflows/uat-db-deploy.yml) or [`prod-db-deploy.yml`](../../../.github/workflows/prod-db-deploy.yml).
- Do not run `npm run seed:uat:reset`, `seed:uat:full-reset`, or [`uat-seed.yml`](../../../.github/workflows/uat-seed.yml).
- Do not run `npm run seed:prod:ministries`.
- Local `supabase db reset` and `npm run seed:dev` are allowed only on local disposable databases.

UAT/production migrate is a manual `workflow_dispatch` that Thomas runs after merge.

## PR notes (required)

State:

- Schema impact (tables, columns, enums, RLS, grants) or **none**.
- Backward compatibility.
- Rollback or forward-fix (restore column, new compensating migration, etc.).
- Whether generated types changed.
- That no shared database was mutated.

DAL field names stay `snake_case`. Do not import `@supabase/supabase-js` from UI code.
