import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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

  it('rejects a mutable Vercel branch alias as a UAT deployment URL', () => {
    const result = spawnSync(
      'bash',
      [
        'scripts/db/validate_uat_deployment_url.sh',
        'https://gather-kids-git-main-tzlukomas-projects.vercel.app',
      ],
      { cwd: root, encoding: 'utf8' }
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('branch alias');
  });

  it('accepts an immutable Vercel deployment URL', () => {
    const result = spawnSync(
      'bash',
      ['scripts/db/validate_uat_deployment_url.sh', 'https://gather-kids-abc123.vercel.app'],
      { cwd: root, encoding: 'utf8' }
    );
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('https://gather-kids-abc123.vercel.app');
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

  it('preflights the exact production deployment while allowing a pending migration', () => {
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
      'production',
      'preflight'
    );
    expect(result.status).toBe(0);
    expect(result.parsed.state).toBe('Production deployment verified');
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
    expect(workflow).not.toContain('deployment_url:');
    expect(workflow).toContain('Discover and verify staged deployment before database changes');
    expect(workflow).toContain('discover_staged_production_deployment.sh');
    expect(workflow).toContain('VERCEL_ORG_ID: ${{ vars.VERCEL_ORG_ID }}');
    expect(workflow).toContain('VERCEL_PROJECT_ID: ${{ vars.VERCEL_PROJECT_ID }}');
    const verifyAt = workflow.indexOf('Verify staged deployment');
    const discoverAt = workflow.indexOf('Discover and verify staged deployment before database changes');
    const promoteAt = workflow.indexOf('Promote staged deployment');
    expect(verifyAt).toBeGreaterThan(0);
    expect(discoverAt).toBeGreaterThan(0);
    expect(discoverAt).toBeLessThan(workflow.indexOf('- name: Apply migrations'));
    expect(promoteAt).toBeGreaterThan(verifyAt);
    const preflight = workflow.slice(discoverAt, workflow.indexOf('- uses: ./.github/actions/setup-supabase-cli'));
    expect(preflight).toContain('write_preflight_failure_summary "staged /api/version returned HTTP');
    expect(preflight).toContain('write_preflight_failure_summary "$reason"');
    expect(preflight).toContain('- **Staged URL:** $staged_url');
  });
});

describe('staged production deployment discovery', () => {
  function selectDeployment(mode: 'list' | 'select', payloads: unknown[]) {
    const dir = mkdtempSync(path.join(tmpdir(), 'staged-production-deployment-'));
    const files = payloads.map((payload, index) => {
      const file = path.join(dir, `deployment-${index}.json`);
      writeFileSync(file, JSON.stringify(payload));
      return file;
    });
    const args =
      mode === 'list'
        ? ['scripts/ci/select_staged_production_deployment.mjs', 'list', files[0], 'project-id']
        : ['scripts/ci/select_staged_production_deployment.mjs', 'select', sha, 'project-id', ...files];
    return spawnSync('node', args, { cwd: root, encoding: 'utf8' });
  }

  const listedDeployment = {
    target: 'production',
    readyState: 'READY',
    projectId: 'project-id',
    url: 'gather-kids-abc123.vercel.app',
  };
  const detailedDeployment = { ...listedDeployment, meta: { githubCommitSha: sha } };

  it('finds a list candidate without list-response Git metadata, then accepts its detailed exact-SHA record', () => {
    const listed = selectDeployment('list', [{ deployments: [listedDeployment] }]);
    expect(listed.status).toBe(0);
    expect(listed.stdout.trim()).toBe('gather-kids-abc123.vercel.app');

    const result = selectDeployment('select', [detailedDeployment]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('https://gather-kids-abc123.vercel.app');
  });

  it('fails closed for ambiguous, mutable, or mismatched detailed records', () => {
    const ambiguous = selectDeployment('select', [detailedDeployment, { ...detailedDeployment, url: 'gather-kids-def456.vercel.app' }]);
    expect(ambiguous.status).toBe(1);
    expect(ambiguous.stderr).toContain('exactly one');

    const mutable = selectDeployment('select', [{ ...detailedDeployment, url: 'gather-kids-git-main-team.vercel.app' }]);
    expect(mutable.status).toBe(1);

    const wrongSha = selectDeployment('select', [{ ...detailedDeployment, meta: { githubCommitSha: otherSha } }]);
    expect(wrongSha.status).toBe(1);
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
    expect(workflow).toContain('validate_uat_deployment_url.sh');
    expect(workflow).not.toContain('vars.UAT_APP_URL');
    expect(workflow).toContain('/api/version');
    expect(workflow).toContain('/api/health');
    expect(workflow).toContain('origin/main');
    expect(workflow).not.toContain('PROD_');
  });
});

describe('UAT release Preview workflow', () => {
  const workflow = readFileSync(path.join(root, '.github/workflows/uat-release.yml'), 'utf8');
  const deployScript = readFileSync(path.join(root, 'scripts/ci/deploy_uat_preview.sh'), 'utf8');

  it('creates a Preview from a main SHA before delegating to the UAT database gate', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('mode:');
    expect(workflow).toContain('git merge-base --is-ancestor "$SHA" origin/main');
    expect(workflow).toContain('environment: uat');
    expect(workflow).toContain('uses: ./.github/workflows/uat-db-deploy.yml');
    expect(workflow).toContain('deployment_url: ${{ needs.create-uat-preview.outputs.deployment_url }}');
    expect(workflow).toContain("dry_run: ${{ inputs.mode == 'dry-run' }}");
  });

  it('constructs only a pinned Preview deployment and rejects production deployment flags', () => {
    expect(deployScript).toContain('vercel@59.24.0 pull --yes --environment=preview');
    expect(deployScript).toContain('vercel@59.24.0 deploy --yes');
    expect(deployScript).toContain('--build-env "NEXT_PUBLIC_DEPLOY_ENV=uat"');
    expect(deployScript).toContain('--env "NEXT_PUBLIC_DEPLOY_ENV=uat"');
    expect(deployScript).not.toMatch(/deploy[^\n]*--prod/);
    expect(deployScript).toContain('validate_uat_deployment_url.sh');
  });

  it('runs the pinned CLI with Preview and UAT arguments only', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'uat-preview-command-'));
    const bin = path.join(dir, 'bin');
    const log = path.join(dir, 'commands.log');
    const previewEnv = path.join(dir, 'preview.env');
    mkdirSync(bin);
    writeFileSync(previewEnv, 'NEXT_PUBLIC_SUPABASE_URL=https://uat.supabase.co\n');
    const npx = path.join(bin, 'npx');
    writeFileSync(
      npx,
      '#!/usr/bin/env bash\nprintf "%s\\n" "$*" >> "$COMMAND_LOG"\nif [[ "$*" == *" deploy "* ]]; then\n  printf "%s\\n" "https://gather-kids-abc123.vercel.app"\nfi\n'
    );
    chmodSync(npx, 0o755);

    const result = spawnSync('bash', ['scripts/ci/deploy_uat_preview.sh', sha], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        COMMAND_LOG: log,
        VERCEL_TOKEN: 'test-token',
        VERCEL_ORG_ID: 'test-org',
        VERCEL_PROJECT_ID: 'test-project',
        UAT_SUPABASE_URL: 'https://uat.supabase.co',
        VERCEL_PREVIEW_ENV_FILE: previewEnv,
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('https://gather-kids-abc123.vercel.app');
    const commands = readFileSync(log, 'utf8');
    expect(commands).toContain('vercel@59.24.0 pull --yes --environment=preview');
    expect(commands).toContain('vercel@59.24.0 deploy --yes');
    expect(commands).toContain('NEXT_PUBLIC_DEPLOY_ENV=uat');
    expect(commands).not.toContain('--prod');
  });
});
