-- Privilege and definition checks for public.fn_schema_migration_status().
-- Run against a database with every migration applied (the db-fk CI job).
-- Any failure below raises, and `psql -v ON_ERROR_STOP=1` fails the job.

\set ON_ERROR_STOP on

DO $$
DECLARE
  def record;
BEGIN
  SELECT p.prosecdef, p.proconfig
  INTO def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'fn_schema_migration_status'
    AND pg_get_function_identity_arguments(p.oid) = '';

  IF def IS NULL THEN
    RAISE EXCEPTION 'public.fn_schema_migration_status() does not exist';
  END IF;

  IF NOT def.prosecdef THEN
    RAISE EXCEPTION 'fn_schema_migration_status must be SECURITY DEFINER';
  END IF;

  IF def.proconfig IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM unnest(def.proconfig) AS cfg(setting)
       WHERE cfg.setting = 'search_path=pg_catalog, pg_temp'
     )
  THEN
    RAISE EXCEPTION
      'fn_schema_migration_status must SET search_path = pg_catalog, pg_temp; got %',
      def.proconfig;
  END IF;
END
$$;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.fn_schema_migration_status()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon may execute fn_schema_migration_status';
  END IF;
  IF has_function_privilege('authenticated', 'public.fn_schema_migration_status()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated may execute fn_schema_migration_status';
  END IF;
  IF NOT has_function_privilege(
    'service_role',
    'public.fn_schema_migration_status()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'service_role cannot execute fn_schema_migration_status';
  END IF;
END
$$;

SELECT 'fn_schema_migration_status privilege checks passed' AS result;
