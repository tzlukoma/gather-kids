import { readFileSync } from 'node:fs';
import path from 'node:path';

const migration = readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260921200000_schema_migration_status.sql'
  ),
  'utf8'
);

const grantCheck = readFileSync(
  path.join(process.cwd(), 'scripts/db/check_schema_migration_status.sql'),
  'utf8'
);

describe('fn_schema_migration_status authorization', () => {
  it('is a no-argument SECURITY DEFINER function with a fixed search_path', () => {
    expect(migration).toMatch(/fn_schema_migration_status\(\)/);
    expect(migration).toMatch(/SECURITY DEFINER/);
    expect(migration).toMatch(/SET search_path = pg_catalog, pg_temp/);
    expect(migration).not.toMatch(/\bEXECUTE format\b/i);
    expect(migration).not.toMatch(/schema_migration_ledger/);
  });

  it('revokes execute from PUBLIC, anon, and authenticated', () => {
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.fn_schema_migration_status\(\) FROM PUBLIC/
    );
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.fn_schema_migration_status\(\) FROM anon/
    );
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.fn_schema_migration_status\(\) FROM authenticated/
    );
  });

  it('grants execute only to service_role', () => {
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.fn_schema_migration_status\(\) TO service_role/
    );
    expect(migration).not.toMatch(/GRANT EXECUTE[\s\S]*TO anon/);
    expect(migration).not.toMatch(/GRANT EXECUTE[\s\S]*TO authenticated/);
  });

  it('CI db-fk asserts grants and that the RPC reads numeric-max history', () => {
    expect(grantCheck).toContain("has_function_privilege('anon'");
    expect(grantCheck).toContain("has_function_privilege('authenticated'");
    expect(grantCheck).toContain("has_function_privilege(\n    'service_role'");
    expect(grantCheck).toContain('RAISE EXCEPTION \'anon may execute');
    expect(grantCheck).toContain(
      "RAISE EXCEPTION 'service_role cannot execute"
    );
    expect(grantCheck).toContain('TRUNCATE supabase_migrations.schema_migrations');
    expect(grantCheck).toContain("('9999', 'squashed_schema')");
    expect(grantCheck).toContain('SET ROLE service_role');
    expect(grantCheck).toContain(
      "got.applied_migration IS DISTINCT FROM '20260921200000'"
    );
    expect(grantCheck).toContain('got.applied_count IS DISTINCT FROM 4');
  });
});
