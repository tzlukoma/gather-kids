# Supabase Integration Implementation Plan

## Overview

We will run **Supabase locally via the Supabase CLI** (which manages Docker for us) for DEV, and use **hosted Supabase Free projects** for UAT/PROD. IndexedDB (Dexie.js) remains for demo mode. A feature flag selects the backend at runtime, and a unified **Data Access Layer (DAL)** abstracts database specifics.

**Avatar storage (NEW):** In **Demo**, store avatars as small base64 WebP strings in IndexedDB. In **DEV/UAT/PROD**, store avatars in **Supabase Storage** (`avatars` bucket) and keep a path reference in Postgres.

## 🎯 Objectives

1. **Triple Support**: IndexedDB (Demo), **Local Postgres (Supabase CLI) for DEV**, Hosted Supabase (UAT/PROD)
2. **Seamless Switching**: Feature-flagged database mode
3. **Unified API**: Single DAL regardless of backend
4. **Environment Mgmt**: DEV (local CLI), UAT, PROD (hosted)
5. **Migrations**: Prisma migrations applied identically across all envs
6. **Realtime & Perf**: Subscriptions (Supabase Realtime) + indexed queries
7. **Type Safety**: Prisma Client types
8. **Avatars (NEW)**: Base64 in Demo; Supabase Storage in DEV/UAT/PROD

---

## 🏗 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Application   │    │   Data Access    │    │  Database Factory   │
│   Components    │───▶│      Layer       │───▶│ (feature-flag mode) │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                                        │
                     ┌──────────────────┴───────────────────┐
                     ▼                                      ▼
        ┌────────────────────┐                  ┌────────────────────┐
        │  IndexedDB (Demo)  │                  │  Supabase Adapter  │
        └────────────────────┘                  └─────────┬──────────┘
                                                          │
                             ┌─────────────────────────────┴────────────────────────────┐
                             ▼                                                          ▼
                   DEV: Supabase CLI (local Postgres+Auth+Realtime)        UAT/PROD: Hosted Supabase
```

---

## 🔧 Phase 1: Supabase CLI & Prisma Setup

### 1.1 Supabase CLI (local DEV)

- **Prereq**: Docker installed (CLI manages it for you)

```bash
npm i -g supabase
supabase init
supabase start            # spins up local Postgres/Auth/Realtime/Storage
# Common ports: DB 54322, Studio 54323, API 54321
```

### 1.2 Prisma (Postgres provider)

```bash
npm install prisma @prisma/client
npx prisma init
```

**`prisma/schema.prisma` (datasource)**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 1.3 Environment Variables

**DEV (local via CLI)**

```env
# .env.development.local
NEXT_PUBLIC_DATABASE_MODE=supabase   # demo | supabase
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?schema=public"

# Local Supabase (for JS client / auth)
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-local-anon-key-from-supabase-config"
SUPABASE_SERVICE_ROLE_KEY="your-local-service-role-key"
```

**UAT**

```env
NEXT_PUBLIC_DATABASE_MODE=supabase
DATABASE_URL="postgresql://postgres:<pwd>@db.<UAT_REF>.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://<UAT_REF>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<uat-anon>"
SUPABASE_SERVICE_ROLE_KEY="<uat-service-role>"
```

**PROD**

```env
NEXT_PUBLIC_DATABASE_MODE=supabase
DATABASE_URL="postgresql://postgres:<pwd>@db.<PROD_REF>.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://<PROD_REF>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<prod-anon>"
SUPABASE_SERVICE_ROLE_KEY="<prod-service-role>"
```

> Tip: the local anon/service keys are printed by `supabase start` and stored in `supabase/config.toml`.

---

## 🔧 Phase 2: Migrations & RLS as Code

### 2.1 Generate & Apply Prisma Migrations (DEV)

```bash
npx prisma migrate dev --name init
# Reset & reseed locally
npx prisma db seed
```

### 2.2 Apply to UAT/PROD

```bash
# Link to UAT
supabase link --project-ref <UAT_REF>
# Ensure DATABASE_URL points to UAT (CI secret)
npx prisma migrate deploy

# Link to PROD
supabase link --project-ref <PROD_REF>
npx prisma migrate deploy
```

### 2.3 RLS Policies (SQL migration)

Put RLS in a SQL migration file (Prisma supports raw SQL):

```sql
-- prisma/migrations/xxxx_add_rls/steps.sql
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

## 🖼️ Avatar Strategy (NEW)

### Demo (IndexedDB / Dexie)

- Add `avatar_base64?: string` on the child (or a demo-only `child_avatars_demo` store).
- Store **small WebP** (≈128–200px, target ≤50–100 KB).
- Render as a Data URL: `data:image/webp;base64,${avatar_base64}`.

### DEV/UAT/PROD (Supabase Storage + Postgres reference)

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

	// Realtime (no-op in Demo)
	subscribeToTable<T>(table: string, cb: (payload: T) => void): () => void;
}
```

### 3.2 IndexedDB Adapter (Demo)

(Keep your Dexie adapter; unchanged.)

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
import { IndexedDBAdapter } from './indexeddb-adapter';
import { SupabaseAdapter } from './supabase-adapter';

export function createDatabaseAdapter() {
	const mode = import.meta.env.NEXT_PUBLIC_DATABASE_MODE || 'demo';
	if (mode === 'supabase') {
		return new SupabaseAdapter(
			import.meta.env.NEXT_PUBLIC_SUPABASE_URL!,
			import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
		);
	}
	return new IndexedDBAdapter();
}
export const db = createDatabaseAdapter();
```

---

## 🔧 Phase 4: Auth & Realtime (DEV parity)

- **Local**: Supabase CLI provides Auth/Realtime endpoints at `http://localhost:54321`.
- **Client**: Use the same Supabase JS client in DEV/UAT/PROD; for Demo mode, mock auth.
- **Realtime**: Narrow subscriptions (e.g., today’s attendance), and invalidate TanStack Query caches on events.

---

## 🔧 Phase 5: Seeding & Data Tools

### 5.1 Prisma Seed (DEV)

```bash
npx prisma db seed
```

- Populate ministries (incl. choirs, Bible Bee), households, guardians, children, registrations, enrollments, sample attendance, incidents.
- **(NEW)** Optionally upload a few sample avatars to the `avatars` bucket and insert matching `child_avatars` rows.

### 5.2 Supabase Seed (UAT/PROD as needed)

Use a separate script with **service role key** for UAT only (never PROD live data unless intended).

---

## 🔧 Phase 6: CI/CD

- **DEV**: local only.

- **UAT**: On tag `uat-*`

  - `supabase link <UAT_REF>`
  - `prisma migrate deploy`
  - Deploy frontend with `--mode=uat`.

- **PROD**: On tag `prod-*`

  - `supabase link <PROD_REF>`
  - `prisma migrate deploy`
  - Deploy frontend with `--mode=production`.

Keep keys as CI secrets. Never log service keys.

---

## 🔧 Phase 7: Testing

- **Domain tests** (no DB) for rules: age/eligibility, Bible Bee windows, auto-enroll SS.
- **Adapter contract tests**: same suite runs against Demo (IndexedDB) and Supabase adapters.
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

**Avatar storage:** Demo = base64 in IndexedDB; DEV/UAT/PROD = Supabase Storage (`avatars` bucket) with path references in `child_avatars`.

---

## ✅ Developer Command Cheatsheet

```bash
# Start local Supabase (one command; Docker handled for you)
supabase start

# Reset local DB (apply migrations + seed)
supabase db reset
npx prisma db seed

# Generate Prisma client after schema changes
npx prisma generate
npx prisma migrate dev --name <change>

# Link and deploy migrations to UAT/PROD
supabase link --project-ref <UAT_REF>
npx prisma migrate deploy

supabase link --project-ref <PROD_REF>
npx prisma migrate deploy

# Stop local services
supabase stop
```

---

## 🚨 Risks & Mitigations

- **Env drift**: Put RLS/policies/triggers in migrations; deploy the same files everywhere.
- **Realtime overuse**: Subscribe narrowly; debounce cache invalidations.
- **Secrets leakage**: Keep anon/service keys in env/CI secrets only.
- **Local setup pain**: CLI abstracts Docker lifecycle—devs only need `supabase start/stop/reset`.
- **(NEW) Avatar payload bloat (Demo)**: enforce downscale to \~128–200px WebP, lazy-load in lists.

---

## 📚 References

- Prisma Migrate (Postgres)
- Supabase JS Client (Auth/Realtime/Storage)
- Supabase CLI (local dev, linking, db push/reset)
- **(NEW)** Supabase Storage (upload, public URL, signed URLs)
