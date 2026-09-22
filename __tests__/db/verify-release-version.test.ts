import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stampGitSha } from '@/lib/build-info';

const root = process.cwd();
const sha = 'a'.repeat(40);
const otherSha = 'b'.repeat(40);

function version(overrides: Record<string, unknown> = {}) {
  return {
    app: '1.18.0',
    gitSha: sha,
    deployEnv: 'uat',
    db: {
      expectedMigration: '20260921200000',
      appliedMigration: '20260921200000',
      appliedCount: 4,
      inSync: true,
    },
    ...overrides,
  };
}

function run(
  payload: unknown,
  expectedSha = sha,
  sqlApplied = '',
  deployEnv = '',
  mode = ''
) {
  const dir = mkdtempSync(path.join(tmpdir(), 'uat-version-'));
  const file = path.join(dir, 'version.json');
  writeFileSync(file, typeof payload === 'string' ? payload : JSON.stringify(payload));
  const args = ['scripts/db/verify_release_version.mjs', file, expectedSha];
  if (deployEnv) {
    args.push(sqlApplied, deployEnv);
    if (mode) args.push(mode);
  } else if (sqlApplied) {
    args.push(sqlApplied);
  }
  const result = spawnSync('node', args, { cwd: root, encoding: 'utf8' });
  let parsed: { state?: string; reason?: string } = {};
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    parsed = {};
  }
  return { status: result.status, parsed, stderr: result.stderr };
}

describe('UAT release version gate', () => {
  it('verifies only when the deployed UAT build matches the selected commit and schema', () => {
    const result = run(version(), sha, '20260921200000');
    expect(result.status).toBe(0);
    expect(result.parsed.state).toBe('UAT verified');
  });

  it('labels a matching build with a schema mismatch as UAT schema pending', () => {
    const result = run(
      version({
        db: {
          expectedMigration: '20260922000000',
          appliedMigration: '20260921200000',
          appliedCount: 4,
          inSync: false,
        },
      })
    );
    expect(result.status).toBe(1);
    expect(result.parsed.state).toBe('UAT schema pending');
  });

  it('does not verify a different build', () => {
    const result = run(version({ gitSha: otherSha }));
    expect(result.status).toBe(1);
    expect(result.parsed.state).toBe('UAT schema pending');
    expect(result.parsed.reason).toContain('selected commit');
  });

  it('preflights the exact UAT deployment while allowing a pending migration', () => {
    const result = run(
      version({
        db: {
          expectedMigration: '20260922000000',
          appliedMigration: '20260921200000',
          appliedCount: 4,
          inSync: false,
        },
      }),
      sha,
      '',
      'uat',
      'preflight'
    );
    expect(result.status).toBe(0);
    expect(result.parsed.state).toBe('UAT deployment verified');
  });

  it('fails closed when migration status is missing', () => {
    const result = run(
      version({
        db: {
          expectedMigration: '20260921200000',
          appliedMigration: null,
          appliedCount: null,
          inSync: false,
        },
      })
    );
    expect(result.status).toBe(1);
    expect(result.parsed.state).toBe('failed');
  });

  it('fails closed when the endpoint is not the UAT deploy', () => {
    const result = run(version({ deployEnv: 'production' }));
    expect(result.status).toBe(1);
    expect(result.parsed.state).toBe('failed');
    expect(result.parsed.reason).toContain('uat');
  });

  it('fails closed when inSync is true but the versions differ', () => {
    const result = run(
      version({
        db: {
          expectedMigration: '20260922000000',
          appliedMigration: '20260921200000',
          appliedCount: 4,
          inSync: true,
        },
      })
    );
    expect(result.status).toBe(1);
    expect(result.parsed.state).not.toBe('UAT verified');
  });

  it('fails closed when the endpoint and the database query disagree', () => {
    const result = run(version(), sha, '20260901000000');
    expect(result.status).toBe(1);
    expect(result.parsed.state).toBe('failed');
  });

  it('fails closed when the deployed SHA is only the short display value', () => {
    const result = run(version({ gitSha: sha.slice(0, 7) }));
    expect(result.status).toBe(1);
    expect(result.parsed.state).toBe('failed');
    expect(result.parsed.reason).toContain('full commit SHA');
  });

  it('keeps a full SHA at runtime and shortens only the display value', () => {
    const stamped = stampGitSha(sha);
    expect(stamped.gitSha).toBe(sha);
    expect(stamped.gitShaShort).toBe(sha.slice(0, 7));
  });

  it('verifies the SHA format inject-build-info actually writes', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'build-info-'));
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: '1.2.3' }));
    mkdirSync(path.join(dir, 'supabase', 'migrations'), { recursive: true });
    writeFileSync(
      path.join(dir, 'supabase', 'migrations', '20260921200000_example.sql'),
      '-- example\n'
    );
    const injected = spawnSync('node', [path.join(root, 'scripts/inject-build-info.mjs')], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        VERCEL_GIT_COMMIT_SHA: sha,
        VERCEL_GIT_COMMIT_REF: 'main',
        NEXT_PUBLIC_DEPLOY_ENV: 'uat',
      },
    });
    expect(injected.status).toBe(0);
    const stamped = JSON.parse(
      readFileSync(path.join(dir, 'src', 'generated', 'build-info.json'), 'utf8')
    );
    expect(stamped.gitSha).toBe(sha);
    expect(stamped.gitShaShort).toBe(sha.slice(0, 7));

    const result = run(
      version({
        app: stamped.appVersion,
        gitSha: stamped.gitSha,
        db: {
          expectedMigration: stamped.expectedMigration,
          appliedMigration: stamped.expectedMigration,
          appliedCount: 1,
          inSync: true,
        },
      }),
      sha
    );
    expect(result.status).toBe(0);
    expect(result.parsed.state).toBe('UAT verified');
  });

  it('verifies a production payload only when the staged build matches', () => {
    const result = run(
      version({ deployEnv: 'production' }),
      sha,
      '20260921200000',
      'production'
    );
    expect(result.status).toBe(0);
    expect(result.parsed.state).toBe('Production DB verified');
  });

  it('does not verify a production build whose schema does not match', () => {
    const result = run(
      version({
        deployEnv: 'production',
        db: {
          expectedMigration: '20260922000000',
          appliedMigration: '20260921200000',
          appliedCount: 4,
          inSync: false,
        },
      }),
      sha,
      '',
      'production'
    );
    expect(result.status).toBe(1);
    expect(result.parsed.state).toBe('failed');
  });

  it('fails closed on invalid JSON', () => {
    const result = run('{');
    expect(result.status).toBe(1);
    expect(result.parsed.state).toBe('failed');
  });
});

describe('production release workflow', () => {
  const workflow = readFileSync(
    path.join(root, '.github/workflows/prod-release.yml'),
    'utf8'
  );

  it('promotes only after the staged production build is in sync', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toContain('push:');
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('verify_release_version.mjs');
    expect(workflow).toContain('production');
    expect(workflow).toContain("vercel@59.24.0 promote");
    expect(workflow).toContain('Production domains were not changed');
    const verifyAt = workflow.indexOf('Verify staged deployment');
    const promoteAt = workflow.indexOf('Promote staged deployment');
    expect(verifyAt).toBeGreaterThan(0);
    expect(promoteAt).toBeGreaterThan(verifyAt);
  });
});

describe('UAT deploy workflow', () => {
  const workflow = readFileSync(
    path.join(root, '.github/workflows/uat-db-deploy.yml'),
    'utf8'
  );

  it('preflights an explicit UAT deployment for the selected main SHA and does not call production', () => {
    expect(workflow).toContain('verify_release_version.mjs');
    expect(workflow).toContain('deployment_url:');
    expect(workflow).toContain('Verify selected UAT deployment before database changes');
    expect(workflow).toContain('UAT deployment does not identify the selected UAT commit. No database changes were made.');
    expect(workflow.indexOf('Verify selected UAT deployment before database changes')).toBeLessThan(
      workflow.indexOf('- name: Apply migrations to UAT')
    );
    expect(workflow).toContain('^https://[a-z0-9][a-z0-9-]*\\.vercel\\.app$');
    expect(workflow).not.toContain('vars.UAT_APP_URL');
    expect(workflow).toContain('/api/version');
    expect(workflow).toContain('/api/health');
    expect(workflow).toContain('origin/main');
    expect(workflow).not.toContain('PROD_');
  });
});
