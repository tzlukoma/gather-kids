import {
  latestMigrationVersion,
  migrationsAreInSync,
  parseMigrationVersion,
} from '@/lib/schema-migration-version';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { buildInfo } from '@/lib/build-info';

describe('schema migration version', () => {
  it('parses the numeric prefix supabase uses as the version', () => {
    expect(
      parseMigrationVersion('20260920190000_one_open_checkin_per_child_per_day.sql')
    ).toBe('20260920190000');
    expect(parseMigrationVersion('0001_init.sql')).toBe('0001');
    expect(parseMigrationVersion('README.md')).toBeNull();
  });

  it('picks the numeric maximum so 9999_squashed_schema is not treated as latest', () => {
    expect(
      latestMigrationVersion([
        '0001_init.sql',
        '9999_squashed_schema.sql',
        '20251001000000_add_is_active_to_leader_assignments.sql',
        '20260920190000_one_open_checkin_per_child_per_day.sql',
      ])
    ).toBe('20260920190000');
  });

  it('is in sync only when both versions are present and equal', () => {
    expect(migrationsAreInSync('20260921200000', '20260921200000')).toBe(true);
    expect(migrationsAreInSync('20260921200000', '20260920190000')).toBe(false);
    expect(migrationsAreInSync('20260920190000', '20260921200000')).toBe(false);
    expect(migrationsAreInSync('20260921200000', null)).toBe(false);
    expect(migrationsAreInSync(null, '20260921200000')).toBe(false);
    expect(migrationsAreInSync(null, null)).toBe(false);
  });

  it('stamps the same latest repo version that inject-build-info writes', () => {
    const files = readdirSync(path.join(process.cwd(), 'supabase/migrations'));
    expect(buildInfo.expectedMigration).toBe(latestMigrationVersion(files));
    expect(buildInfo.expectedMigration).toMatch(/^\d+$/);
  });
});
