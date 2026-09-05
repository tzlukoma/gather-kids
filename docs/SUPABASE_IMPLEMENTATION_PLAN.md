# Supabase Integration Implementation Plan

> **Historical plan.** Demo/IndexedDB mode was removed at runtime. The factory always returns `SupabaseAdapter`. There is no `DATABASE_MODE`. Demos use UAT. Leftover Dexie files are tracked in [#266](https://github.com/tzlukoma/gather-kids/issues/266). Treat the architecture below as the original migration plan, not current operator instructions.

## Overview

We run **Supabase locally via the Supabase CLI** (which manages Docker) for DEV, and **hosted Supabase** for UAT/PROD. A unified **Data Access Layer (DAL)** abstracts database specifics. IndexedDB (Dexie.js) was the former demo backend and is **not** a supported runtime.

**Avatar storage:** Store avatars in **Supabase Storage** (`avatars` bucket) and keep a path reference in Postgres. Base64-in-IndexedDB was a demo-only path and is removed.

## 🎯 Objectives

1. **Local + hosted Supabase**: Local Postgres (Supabase CLI) for DEV; hosted projects for UAT/PROD
2. **Unified API**: Single DAL; factory always returns `SupabaseAdapter`
3. **Environment Mgmt**: DEV (local CLI), UAT, PROD (hosted)
4. **Migrations**: PostgreSQL migrations applied identically across all envs
5. **Realtime & Perf**: Subscriptions (Supabase Realtime) + indexed queries
6. **Type Safety**: TypeScript types + Supabase type generation
7. **Avatars**: Supabase Storage in every environment

---

## 🏗 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Application   │    │   Data Access    │    │  Database Factory   │
│   Components    │───▶│      Layer       │───▶│ always SupabaseAdapter │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                                        │
                                        ▼
                             ┌────────────────────┐
                             │  Supabase Adapter  │
                             └─────────┬──────────┘
                                       │
          ┌────────────────────────────┴────────────────────────────┐
          ▼                                                         ▼
DEV: Supabase CLI (local Postgres+Auth+Realtime)        UAT/PROD: Hosted Supabase
```

---

## 🔧 Phase 1: Supabase CLI Setup

### 1.1 Supabase CLI (local DEV)

- **Prereq**: Docker installed (CLI manages it for you)

```bash
npm i -g supabase
supabase init
supabase start            # spins up local Postgres/Auth/Realtime/Storage
# Common ports: DB 54322, Studio 54323, API 54321
```

### 1.2 TypeScript Types (Supabase Type Generation)

```bash
npm install @supabase/supabase-js
npm install --save-dev supabase@latest
```

Configure type generation in your project:

**`supabase/config.toml`** (add or update)

```toml
[generate_types]
typescript = true
```

Then generate types from your schema:

```bash
supabase gen types typescript --project-id <project-id> --schema public > src/lib/database/supabase-types.ts
```

For local development, you can generate types from your local instance:

```bash
supabase gen types typescript --local > src/lib/database/supabase-types.ts
```

### 1.3 Environment Variables

**DEV (local via CLI)**

```env
# .env.development.local
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?schema=public"

# Local Supabase (for JS client / auth)
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-local-anon-key-from-supabase-config"
SUPABASE_SERVICE_ROLE_KEY="your-local-service-role-key"
```

**UAT**

```env
DATABASE_URL="postgresql://postgres:<pwd>@db.<UAT_REF>.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://<UAT_REF>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<uat-anon>"
SUPABASE_SERVICE_ROLE_KEY="<uat-service-role>"
```

**PROD**

```env
DATABASE_URL="postgresql://postgres:<pwd>@db.<PROD_REF>.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://<PROD_REF>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<prod-anon>"
SUPABASE_SERVICE_ROLE_KEY="<prod-service-role>"
```

> Tip: the local anon/service keys are printed by `supabase start` and stored in `supabase/config.toml`.

---

## 🔧 Phase 2: SQL Migrations & RLS as Code

### 2.1 Create & Apply PostgreSQL Migrations (DEV)

Create numbered migration files in `supabase/migrations` directory:

```bash
# Example naming convention
supabase/migrations/0001_init.sql
supabase/migrations/0002_add_households_children.sql
supabase/migrations/0003_add_rls_policies.sql
```

Apply migrations locally:

```bash
supabase db reset
# or for just migrations without seed data
supabase migration up
```

### 2.2 Apply to UAT/PROD

```bash
# Link to UAT
supabase link --project-ref <UAT_REF>
supabase db push

# Link to PROD
supabase link --project-ref <PROD_REF>
supabase db push
```

### 2.3 RLS Policies (SQL migration)

Put RLS in a dedicated SQL migration file:

```sql
-- supabase/migrations/0003_add_rls_policies.sql
alter table households enable row level security;
-- repeat for relevant tables...

create policy "family_can_read_own_household" on households
  for select using (exists (
    select 1 from user_households uh where uh.household_id = households.household_id
      and uh.user_id = auth.uid()::text
  ));
-- Add leader/admin policies similarly
```

> Store all **policies, views, functions, triggers** in migrations so DEV/UAT/PROD stay in sync.

---

## 🖼️ Avatar Strategy

### All environments (Supabase Storage + Postgres reference)

Demo-mode base64 in IndexedDB is **removed**.

- **Bucket** (public for MVP):

  ```bash
  supabase storage create-bucket avatars --public
  ```

- **Reference table**:

  ```sql
  create table if not exists child_avatars (
    child_id uuid primary key references children(child_id) on delete cascade,
    storage_path text not null,                     -- e.g. 'avatars/<child_uuid>.webp'
    media_type text not null default 'image/webp',
    updated_at timestamptz not null default now()
  );
  ```

- **RLS suggestions**:

  ```sql
  alter table child_avatars enable row level security;

  create policy family_read_avatars on child_avatars
    for select using (exists (
      select 1 from children c
      join user_households uh on uh.household_id = c.household_id
      where c.child_id = child_avatars.child_id and uh.user_id = auth.uid()::text
    ));

  create policy family_upsert_own_avatars on child_avatars
    for insert with check (exists (
      select 1 from children c
      join user_households uh on uh.household_id = c.household_id
      where c.child_id = child_avatars.child_id and uh.user_id = auth.uid()::text
    ));

  create policy family_update_own_avatars on child_avatars
    for update using (exists (
      select 1 from children c
      join user_households uh on uh.household_id = c.household_id
      where c.child_id = child_avatars.child_id and uh.user_id = auth.uid()::text
    ));
  ```

- **Upload flow** (client):

  1. Downscale & convert to **WebP** in-browser.
  2. Upload:

     ```ts
     const path = `avatars/${childId}.webp`;
     await supabase.storage
     	.from('avatars')
     	.upload(path, file, { upsert: true });
     await supabase
     	.from('child_avatars')
     	.upsert({ child_id: childId, storage_path: path });
     ```

- **Display flow**:

  ```ts
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  img.src = data.publicUrl;
  ```

- **Notes**:

  - Keep original files small (reject > 512 KB before processing).
  - Lazy-load avatars in lists; cache in browser if desired.
  - Later you can switch the bucket to **private + signed URLs** without touching the UI (only the adapter logic changes).

---

## 🔧 Phase 3: Database Abstraction Layer

### 3.1 Adapter Interface

```ts
// src/lib/database/types.ts
export interface DatabaseAdapter {
	// Households
	getHousehold(id: string): Promise<Household | null>;
	createHousehold(data: HouseholdCreate): Promise<Household>;
	updateHousehold(id: string, data: Partial<Household>): Promise<Household>;
	listHouseholds(filters?: HouseholdFilters): Promise<Household[]>;

	// Children
	getChild(id: string): Promise<Child | null>;
	createChild(data: ChildCreate): Promise<Child>;
	updateChild(id: string, data: Partial<Child>): Promise<Child>;
	listChildren(filters?: ChildFilters): Promise<Child[]>;

	// Attendance
	getAttendance(id: string): Promise<Attendance | null>;
	createAttendance(data: AttendanceCreate): Promise<Attendance>;
	updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance>;
	listAttendance(filters?: AttendanceFilters): Promise<Attendance[]>;

	// Realtime
	subscribeToTable<T>(table: string, cb: (payload: T) => void): () => void;
}
```

### 3.2 Factory (always Supabase)

The IndexedDB/demo adapter is **not** part of the current runtime. Leftover files are tracked in #266.

### 3.3 Supabase Adapter (DEV/UAT/PROD)

```ts
// src/lib/database/supabase-adapter.ts
import { createClient } from '@supabase/supabase-js';
export class SupabaseAdapter implements DatabaseAdapter {
	constructor(private url: string, private anon: string) {}
	private get client() {
		return createClient(this.url, this.anon);
	}

	async getHousehold(id: string) {
		const { data, error } = await this.client
			.from('households')
			.select('*')
			.eq('household_id', id)
			.single();
		if (error) throw error;
		return data;
	}
	// ...other CRUD using .from().insert().update().select()

	subscribeToTable<T>(table: string, cb: (payload: T) => void) {
		const ch = this.client
			.channel(`public:${table}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table },
				() => cb as any
			)
			.subscribe();
		return () => {
			this.client.removeChannel(ch);
		};
	}
}
```

### 3.4 Factory

```ts
// src/lib/database/factory.ts
import { SupabaseAdapter } from './supabase-adapter';

export function createDatabaseAdapter() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !anon) {
		throw new Error(
			'Supabase configuration is required. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
		);
	}
	return new SupabaseAdapter(url, anon);
}
export const db = createDatabaseAdapter();
```

---

## 🔧 Phase 4: Auth & Realtime (DEV parity)

- **Local**: Supabase CLI provides Auth/Realtime endpoints at `http://localhost:54321`.
- **Client**: Use the same Supabase JS client in DEV/UAT/PROD. Auth is always Supabase Auth.
- **Realtime**: Narrow subscriptions (e.g., today’s attendance), and invalidate TanStack Query caches on events.

---

## 🔧 Phase 5: Seeding & Data Tools

### 5.1 Supabase Seed Scripts (DEV)

Create seed scripts in the `supabase/seed` directory:

```bash
# Create a seed file
touch supabase/seed.sql

# Apply seed data after migrations
supabase db reset
```

- Populate ministries (incl. choirs, Bible Bee), households, guardians, children, registrations, enrollments, sample attendance, incidents.
- **(NEW)** Optionally upload a few sample avatars to the `avatars` bucket and insert matching `child_avatars` rows.

### 5.2 Supabase Data Import (UAT/PROD as needed)

Use a separate script with **service role key** for UAT only (never PROD live data unless intended):

```bash
# Custom script for data import
node scripts/import/importToSupabase.js --env=uat
```

---

## 🔧 Phase 6: CI/CD

- **DEV**: local only.

- **UAT**: On tag `uat-*`

  - `supabase link <UAT_REF>`
  - `supabase db push`
  - Deploy frontend with `--mode=uat`.

- **PROD**: On tag `prod-*`

  - `supabase link <PROD_REF>`
  - `supabase db push`
  - Deploy frontend with `--mode=production`.

Keep keys as CI secrets. Never log service keys.

---

## 🔧 Phase 7: Testing

- **Domain tests** (no DB) for rules: age/eligibility, Bible Bee windows, auto-enroll SS.
- **Adapter contract tests**: suite runs against the Supabase adapter.
- **Migration tests**: Verify migrations apply cleanly against a fresh database.
- **E2E** (happy paths): registration submit, SS auto-enroll, choir validation, Bible Bee enrollment.

---

## 🔧 Phase 8: Monitoring & Performance

- Prefer **SQL views** for dashboard metrics.
- Add **indexes** on common filters: `(ministry_id, cycle_id)`, `(child_id, date)`, `(event_id, date)`.
- Use server-side pagination; avoid chatty realtime channels.
- **(NEW)** Avatars: keep images tiny; consider private bucket + signed URLs later if privacy requirements tighten.

---

## 📋 Environment Matrix

| Env  | DB                            | Auth/Realtime | Cost | Notes                             |
| ---- | ----------------------------- | ------------- | ---- | --------------------------------- |
| DEV  | Supabase CLI (local Postgres) | Yes           | \$0  | CLI abstracts Docker; full parity |
| UAT  | Hosted Supabase (Free)        | Yes           | \$0  | Stakeholder testing               |
| PROD | Hosted Supabase (Free)        | Yes           | \$0  | Live                              |

**Avatar storage:** Supabase Storage (`avatars` bucket) with path references in `child_avatars` (every environment). Demo base64/IndexedDB is removed.

---

## ✅ Developer Command Cheatsheet

```bash
# Start local Supabase (one command; Docker handled for you)
supabase start

# Reset local DB (apply migrations + seed)
supabase db reset

# Create a new migration
touch supabase/migrations/$(date +%s)_add_new_feature.sql
# Then edit the file with your SQL changes

# Generate TypeScript types
supabase gen types typescript --local > src/lib/database/supabase-types.ts

# Link and deploy migrations to UAT/PROD
supabase link --project-ref <UAT_REF>
supabase db push

supabase link --project-ref <PROD_REF>
supabase db push

# Stop local services
supabase stop
```

---

## 🚨 Risks & Mitigations

- **Env drift**: Put RLS/policies/triggers in migrations; deploy the same files everywhere.
- **Realtime overuse**: Subscribe narrowly; debounce cache invalidations.
- **Secrets leakage**: Keep anon/service keys in env/CI secrets only.
- **Local setup pain**: CLI abstracts Docker lifecycle—devs only need `supabase start/stop/reset`.
- **Avatar payload size**: enforce downscale to ~128–200px WebP, lazy-load in lists.

---

## Outstanding leftover (not current architecture)

The adapter, factory, type generation, and Supabase auth described above **shipped**. Do not treat the old "switch between demo and Supabase" tasks as open runtime work.

Leftover Dexie/IndexedDB files, import scripts, and docs cleanup: [#266](https://github.com/tzlukoma/gather-kids/issues/266).

## 📚 References

- Supabase JS Client (Auth/Realtime/Storage)
- Supabase CLI (local dev, linking, db push/reset)
- PostgreSQL migrations
- **(NEW)** Supabase Storage (upload, public URL, signed URLs)

## UAT quick note

For UAT verification, use the Supabase CLI to link to your UAT project and deploy migrations:

```bash
supabase link --project-ref <UAT_REF>
supabase db push
```

Addendum: Load your `.env.uat` before running commands, for example:

```bash
# in zsh
source .env.uat
# Leftover Dexie importer — not a supported runtime path; tracked in #266
# node scripts/import/importDexie.js --file scripts/seed/gather-kids-export.json --mapping scripts/import/mappings/1756440851677-mapping.json
```
