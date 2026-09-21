import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function runDeclaration(body: string, changed: string[]) {
  const dir = mkdtempSync(path.join(tmpdir(), 'schema-change-'));
  const list = path.join(dir, 'changed.txt');
  writeFileSync(list, changed.length ? `${changed.join('\n')}\n` : '');
  return spawnSync(
    'bash',
    [
      'scripts/db/check_schema_change_declaration.sh',
      '--changed-file',
      list,
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        PR_BODY: body,
        GITHUB_STEP_SUMMARY: path.join(dir, 'summary.md'),
      },
    }
  );
}

describe('CI migration application fails fast', () => {
  const ci = read('.github/workflows/ci.yml');

  it('stops the migration replay on the first SQL error', () => {
    const apply = ci.split('- name: Apply SQL migrations')[1]?.split('- name:')[0];
    expect(apply).toBeDefined();
    expect(apply).toContain('-v ON_ERROR_STOP=1');
    expect(apply).toContain('supabase/migrations/*.sql');
  });

  it('stops bootstrap SQL on the first error', () => {
    const bootstrap = ci
      .split('- name: Bootstrap CI Postgres for Supabase migrations')[1]
      ?.split('- name:')[0];
    expect(bootstrap).toBeDefined();
    expect(bootstrap).toContain('-v ON_ERROR_STOP=1');
    expect(bootstrap).toContain('scripts/db/bootstrap_ci_postgres.sql');
  });

  it('keeps the migration-status RPC check in db-fk', () => {
    expect(ci).toContain('scripts/db/check_schema_migration_status.sql');
    expect(ci).toContain('scripts/db/check_fks.sh');
    expect(ci).toContain('scripts/db/check_types_sync.sh');
  });
});

describe('schema-change declaration', () => {
  it('passes when the pull request does not touch migrations', () => {
    const result = runDeclaration('Schema change: none', []);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Schema change: none');
  });

  it('fails when migrations change without a documented declaration', () => {
    const result = runDeclaration('Schema change: none', [
      'supabase/migrations/20260922000000_example.sql',
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Schema change: documented');
  });

  it('passes when migrations change and the body documents them', () => {
    const result = runDeclaration(
      'Summary\n\nSchema change: documented\n\n- Migrations: example\n',
      ['supabase/migrations/20260922000000_example.sql']
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('20260922000000_example.sql');
  });
});

describe('quarantined remote schema paths', () => {
  const scripts = [
    'scripts/db/apply_migrations_safe.sh',
    'scripts/db/apply_prod_migrations.sh',
    'scripts/db/complete_table_setup.sh',
    'scripts/db/create_missing_tables.sh',
    'scripts/db/create_simple_sql.sh',
    'scripts/db/execute_sql_reliable.sh',
    'scripts/db/fix_uuid_to_text.sh',
    'scripts/db/fresh_link_and_push.sh',
    'scripts/db/repair_migrations.sh',
    'scripts/db/safe_apply_migrations.sh',
    'scripts/db/safe_table_setup.sh',
    'scripts/db/simple_prod_migrations.sh',
  ];

  const workflows = [
    '.github/workflows/uat-db-check.yml',
    '.github/workflows/setup-tables-on-demand.yml',
    '.github/workflows/ensure-pgcrypto.yml',
  ];

  it.each(scripts)('%s refuses to run', (script) => {
    const result = spawnSync('bash', [script], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Quarantined');
    expect(result.stderr).toContain('supabase db push');
  });

  it.each(workflows)('%s cannot apply remote SQL', (workflow) => {
    const text = read(workflow);
    const run = text.split('run:')[1] ?? '';
    expect(text).toContain('quarantined');
    expect(run).toContain('exit 1');
    expect(run).not.toMatch(/apply_migrations_safe|execute_sql_reliable|psql |secrets\./);
    expect(text).not.toMatch(/\$\{\{\s*secrets/);
  });

  it('leaves the canonical push wrapper and the prod extension pre-step runnable', () => {
    expect(read('scripts/db/apply_migrations_cli.sh')).toContain('supabase db push');
    expect(read('scripts/db/apply_migrations_cli.sh')).not.toContain(
      'refuse_quarantined_mutation.sh'
    );
    expect(read('.github/workflows/prod-db-deploy.yml')).toContain(
      'scripts/db/apply_migrations_cli.sh'
    );
    expect(read('.github/workflows/uat-db-deploy.yml')).toContain(
      'scripts/db/apply_migrations_cli.sh'
    );
  });
});
