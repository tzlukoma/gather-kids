-- Minimal Supabase-compatible roles/schema for applying migrations in CI Postgres.
CREATE SCHEMA IF NOT EXISTS auth;

DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Supabase grants these, and a policy that calls auth.uid() in its own text --
-- rather than inside a security-definer helper -- is evaluated as the querying
-- role, so without this it fails with "permission denied for schema auth"
-- instead of deciding. That is the difference between a policy CI has applied
-- and a policy CI has exercised.
GRANT USAGE ON SCHEMA auth TO anon, authenticated;

-- auth.jwt() and auth.uid() stubs used by RLS policies in several migrations.
-- Both read the same request-scoped setting Supabase's own versions read, so a
-- CI check can impersonate a caller with
--   set local request.jwt.claims = '{"sub":"...","app_metadata":{"role":"ADMIN"}}';
-- and see the policies decide. With nothing set they return '{}' and NULL, which
-- is what applying a migration needs.
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;

-- Minimal auth.users so policies can be created. Supabase provides this
-- table; CI Postgres does not. The audit-log policy reads id and
-- raw_user_meta_data. No rows are inserted.
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  raw_user_meta_data jsonb
);

-- Shape of the table `supabase db push` writes. CI applies SQL with raw psql,
-- so this history never appears unless we create it. The status RPC reads it.
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text PRIMARY KEY,
  statements text[],
  name text
);
