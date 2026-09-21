-- Expose aggregate migration status from Supabase's internal history table.
--
-- `supabase db push` records applied files in
-- `supabase_migrations.schema_migrations`. That schema is not on the Data API,
-- and the table is readable only by the migration owner — so /api/version
-- cannot query it directly. This function returns only the latest numeric
-- version and the row count. It takes no arguments (no caller-controlled SQL),
-- runs as the owner so it can read the internal table, and is executable only
-- by `service_role`.
--
-- `statements` (the applied SQL) and `name` are never returned.

CREATE OR REPLACE FUNCTION public.fn_schema_migration_status()
RETURNS TABLE(applied_migration text, applied_count integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF pg_catalog.to_regclass('supabase_migrations.schema_migrations') IS NULL THEN
    applied_migration := NULL;
    applied_count := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (
      SELECT m.version
      FROM supabase_migrations.schema_migrations AS m
      WHERE m.version ~ '^[0-9]+$'
      ORDER BY m.version::pg_catalog.numeric DESC
      LIMIT 1
    ),
    (
      SELECT pg_catalog.count(*)::pg_catalog.int4
      FROM supabase_migrations.schema_migrations
    );
END;
$$;

COMMENT ON FUNCTION public.fn_schema_migration_status() IS
  'Aggregate supabase_migrations.schema_migrations status for service_role. Returns latest numeric version and applied count only.';

REVOKE ALL ON FUNCTION public.fn_schema_migration_status() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.fn_schema_migration_status() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.fn_schema_migration_status() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.fn_schema_migration_status() TO service_role;
  END IF;
END
$$;
