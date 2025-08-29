# Supabase Guide — gather-kids

This file collects the step-by-step Supabase setup, local development commands, migration and seeding guidance, and a safe plan to migrate your client-side (Dexie/IndexedDB) data into Supabase.

Short checklist

- Create Supabase projects (dev and prod) and save project refs + keys.
- Install Docker and Supabase CLI locally.
- Initialize `supabase/` in this repo and start a local stack.
- Add migrations (DDL) and apply locally.
- Add RLS policies and seed curated scriptures using a server-side seed script.
- Create an import script for Dexie -> Supabase and verify locally.
- Add CI steps to safely apply migrations and protect service keys.

Prerequisites (macOS)

- Docker Desktop
- Homebrew or npm (for Supabase CLI)
- Node.js (for seed/import scripts)

Install Supabase CLI

```bash
# Homebrew (recommended)
brew install supabase/tap/supabase

# or npm
npm install -g supabase

supabase --version
```

Login & initialize the repo

```bash
supabase login
cd /path/to/gather-kids
supabase init
```

Start local Supabase stack

```bash
supabase start
# to stop
supabase stop
```

Create migrations (recommended workflow)

- Add SQL migration files under `supabase/migrations/` (or use `supabase migration new <name>` if your CLI supports it).
- Example minimal SQL (create extension + scriptures table):

```sql
-- supabase/migrations/0001_init.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS scriptures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_year_id uuid NOT NULL,
  order integer NOT NULL,
  reference text NOT NULL,
  texts jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

Apply migrations locally

```bash
supabase db push    # OR use the migration apply command for your CLI version
```

Row-Level Security (RLS) and policies

- Enable RLS on sensitive tables and add policies for expected access patterns.
- Keep administrative writes gated by the service_role key.

Example policy sketch (adjust to your auth model):

```sql
ALTER TABLE scriptures ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_authenticated_read ON scriptures
  FOR SELECT USING (auth.role() IS NOT NULL);

-- Server/service-role writes should use the service_role key (insert/update/delete allowed only for server)
```

Seeding curated scriptures

- Prefer a server-side Node seed script that uses the service_role key so RLS doesn't block inserts.

Example seed script (Node):

```js
// scripts/seedScriptures.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey);

const scriptures = JSON.parse(
	fs.readFileSync('./scripts/seed/scriptures.json', 'utf8')
);
await supabase.from('scriptures').upsert(scriptures);
```

Run seed locally

```bash
SUPABASE_URL=http://localhost:54321 SUPABASE_SERVICE_ROLE_KEY="$(cat ~/.supabase/local-service-role-key)" node scripts/seedScriptures.js
```

Integrate with Next.js environment variables

- Add to `.env.local` (never commit):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> # server only
```

Create server & client Supabase clients

- Server (server-only, uses service role):

```js
// src/lib/supabaseAdmin.ts (server-only)
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

- Client (for use in browser components):

```js
// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

Migrating existing Dexie (IndexedDB) data

- Strategy A: Export from browser to JSON and import via Node script using the service role key.
- Strategy B: Build a small admin UI for uploading JSON which calls a server API route that inserts/upserts data.

Export snippet (run in browser console on a dev instance):

```js
(async function exportDexie() {
	const db = window.gatherKidsDB; // adapt to your Dexie instance name
	const data = {
		children: await db.children.toArray(),
		households: await db.households.toArray(),
		// add other stores as needed
	};
	const blob = new Blob([JSON.stringify(data, null, 2)], {
		type: 'application/json',
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'gather-kids-export.json';
	a.click();
})();
```

Import pattern (Node script)

- Read JSON, map to Supabase table shapes, upsert in chunks (200 rows per batch), and insert parents before children.

Edge cases & tips

- Use the service_role key for writes during migration to bypass RLS.
- Chunk large inserts to avoid timeouts.
- Use upsert to avoid unique constraint conflicts, or normalize ids first.
- Backup production DB before any migration (pg_dump or Supabase console snapshot).

CI and deployment guidance

- Keep migrations under `supabase/migrations/` and run them from a protected CI job with the service_role key stored in secrets.
- Avoid exposing the service_role key in untrusted PRs (use environment protections / require manual approval).
- Recommended flow: apply migrations to staging on merge to `main`, then run a manual-production migration step with approval.

Backups & rollback

- Create a DB dump or snapshot before destructive migrations.
- Prefer reversible migrations or include explicit `down` SQL in your process and validate rollback on staging.

Quick next steps for you (do these now)

1. Install Docker Desktop and Supabase CLI.
2. Run `supabase init` in the repo if you haven't already.
3. Create `supabase/migrations/0001_init.sql` (use the example above) and run `supabase db push`.
4. Create `scripts/seed/scriptures.json` from your curated data and run the Node seed script with your local service role key.
5. Export IndexedDB from a running dev instance and run an import script to verify mapping.

If you want, I can now:

- Inspect your TypeScript types and generate a matching SQL migration for your schema.
- Draft the Node import script (Dexie JSON -> Supabase) with chunking and error handling.
- Create the seed script and a small sample `scripts/seed/scriptures.json` file from your curated data.

Choose one of the three and I'll generate the files and run the quick validations I can from the repo.
