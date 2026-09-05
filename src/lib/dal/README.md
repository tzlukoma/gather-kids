# DAL — Data Access Layer

The `src/lib/dal/` directory contains the Supabase-backed data access layer for gather-kids. It is organised into one file per domain.

## Public API

All application code should import from `@/lib/dal`:

```ts
import { getAllChildren, registerHousehold, getBrandingSettings } from '@/lib/dal';
```

`src/lib/dal.ts` is the thin facade that re-exports everything from the domain modules in this directory.

For tree-shaking or direct domain imports:

```ts
import { getAttendanceForDate } from '@/lib/dal/attendance';
import { registerHousehold }    from '@/lib/dal/registration';
```

## Module layout

| File | Domain |
|------|--------|
| `utils.ts` | Shared date/formatting utilities with no database dependency |
| `attendance.ts` | Check-in/check-out, incidents |
| `households.ts` | Households, guardians, emergency contacts |
| `children.ts` | Children, ministry enrollments (per-child) |
| `ministries.ts` | Ministries, ministry groups, ministry accounts, registration cycles |
| `leaders.ts` | Leader profiles, ministry leader memberships |
| `bible-bee.ts` | Bible Bee years/cycles, divisions, scriptures, essay prompts, enrollments, progress |
| `branding.ts` | Branding settings, entity avatars, user profile management |
| `dashboard.ts` | Dashboard aggregated metrics, user management |
| `cycle-scoping.ts` | Active-cycle child/household inclusion for staff UI (#250) |
| `exports.ts` | CSV exports (roster, attendance rollup), scripture CSV/JSON upload |
| `registration.ts` | Full household registration transaction |
| `index.ts` | Barrel re-export of all modules above |

### Active cycle scoping (staff UI)

Operational lists (check-in, rosters default, registrations admin default, dashboard
registration counts) use helpers in `cycle-scoping.ts`:

- Default inclusion: **`registrations` ∪ enrolled `ministry_enrollments`** for the active cycle
- Resolver: `requireActiveRegistrationCycle()` — never hardcode year strings
- Guardian R1 routing remains **registrations-only** (`householdHasActiveCycleRegistration`)

See `docs/ACTIVE_CYCLE_SCOPING_PLAN.md`.

Every domain module delegates exclusively to the Supabase adapter:

```ts
import { db as dbAdapter } from '../database/factory';
```

`dbAdapter` implements the `DatabaseAdapter` interface defined in
`src/lib/database/types.ts`. It is the `SupabaseAdapter` class from
`src/lib/database/supabase-adapter.ts`.

The app is Supabase-only. There is no IndexedDB / demo-mode data path.

## Adding a new domain function

1. Add the function to the appropriate domain file (e.g. `attendance.ts`).
2. Make it async and delegate to `dbAdapter`.
3. Export it — it will automatically be available via `@/lib/dal` through the
   barrel in `index.ts`.
4. Add a React Query hook in `src/hooks/data/` if the function will be called
   from UI components.
