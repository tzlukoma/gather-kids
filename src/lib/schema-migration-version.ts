/**
 * Supabase CLI versions a migration as the numeric prefix before the first
 * underscore (`20260920190000_one_open_checkin_per_child_per_day.sql` →
 * `20260920190000`). Lexicographic max would pick `9999_squashed_schema.sql`
 * over later timestamps, so "latest" is the maximum numeric value.
 */

const VERSION_PREFIX = /^(\d+)_/;

export function parseMigrationVersion(filename: string): string | null {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const match = base.match(VERSION_PREFIX);
  return match?.[1] ?? null;
}

export function latestMigrationVersion(filenames: string[]): string | null {
  let best: string | null = null;
  let bestNum = BigInt(-1);

  for (const name of filenames) {
    const version = parseMigrationVersion(name);
    if (version === null) continue;
    const n = BigInt(version);
    if (n > bestNum) {
      bestNum = n;
      best = version;
    }
  }

  return best;
}

export function migrationsAreInSync(
  expectedMigration: string | null,
  appliedMigration: string | null
): boolean {
  if (expectedMigration === null || appliedMigration === null) return false;
  return expectedMigration === appliedMigration;
}
