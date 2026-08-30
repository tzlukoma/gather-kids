# Supabase API keys (publishable & secret)

Supabase is replacing legacy JWT-based **anon** and **service_role** keys with **publishable** and **secret** keys. Legacy keys remain valid until **late 2026**; both types can coexist during migration.

Official guides:

- [Understanding API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)

## Where to find them

1. [Supabase Dashboard](https://supabase.com/dashboard) → your project (UAT or production separately)
2. **Project Settings → API**
3. Tab **Publishable and secret API keys** (not **Legacy API keys**, unless you still need the old JWT values)

| Dashboard | Format | gather-kids env var (today) | Use |
|-----------|--------|----------------------------|-----|
| **Publishable key** | `sb_publishable_...` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser / client (`createClient` in Next.js) |
| **Secret key** (`default`) | `sb_secret_...` | `SUPABASE_SERVICE_ROLE_KEY` | Server routes, scripts, GitHub Actions |

Also copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`.

If you only see **Legacy API keys** (`anon`, `service_role`), click **Create new API keys** on the API Keys tab — that adds publishable + secret without breaking legacy keys.

## Do we have to change gather-kids code?

**Not immediately.** The app passes these strings to `@supabase/supabase-js` `createClient(url, key)`. Publishable and secret keys are drop-in replacements for anon and service_role in that pattern.

**What you change:** the **values** in Vercel, GitHub Environment secrets, and `.env.uat` / `.env.local` — not necessarily the variable names yet.

```ts
// Same code — publishable key goes in NEXT_PUBLIC_SUPABASE_ANON_KEY today
createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
```

## Mapping (legacy → new)

| Legacy | New | Privilege |
|--------|-----|-----------|
| `anon` | Publishable | Low; RLS applies |
| `service_role` | Secret | Elevated; bypasses RLS |

## GitHub / Vercel secret names (CI/CD plan)

Keep existing secret **names** for now; put **new key values** inside them:

| GitHub / Vercel name | Put this value from dashboard |
|----------------------|-------------------------------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (`default`) |

Optional future rename in a small PR: `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with fallbacks in code.

## Local Supabase CLI

`supabase start` / `supabase status` still prints `anon` and `service_role` for the local stack — that is fine for local e2e (`.env.e2e.local`).

## Edge cases (not used in main app paths)

- **Do not** put secret keys in the browser or `NEXT_PUBLIC_*`.
- **pg_net / Database Webhooks** using `Authorization: Bearer <service_role>` must switch to `apikey: sb_secret_...` — gather-kids does not use this in production app code; a few old debug scripts use Bearer headers and would need updating if you point them at secret keys.
- **Edge Functions** with `verify_jwt` — not applicable to this Next.js repo today.

## Migration checklist (when you rotate)

1. Create publishable + secret keys in UAT and prod projects.
2. Update Vercel Preview (UAT) and Production env vars with new values.
3. Update GitHub Environment secrets (`uat`, `production`).
4. Update local `.env.uat` / `.env.local`.
5. Deploy and smoke-test login, register, admin API routes.
6. Deactivate legacy anon/service_role in dashboard when nothing uses them.

This can ride along with CI/CD cleanup; it does not block trunk-based `main` work.
