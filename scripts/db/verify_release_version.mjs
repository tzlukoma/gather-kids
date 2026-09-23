#!/usr/bin/env node
/**
 * Decide whether a deployed /api/version payload is verified for a selected
 * commit. Prints one JSON object on stdout.
 *
 * Usage: node scripts/db/verify_release_version.mjs <version.json> <sha> [sqlAppliedVersion] [uat|production] [preflight]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function result(state, reason, payload) {
  const db =
    payload && typeof payload === 'object' && payload.db && typeof payload.db === 'object'
      ? payload.db
      : {};
  const body = {
    state,
    reason,
    gitSha: typeof payload?.gitSha === 'string' ? payload.gitSha : null,
    app: typeof payload?.app === 'string' ? payload.app : null,
    deployEnv: typeof payload?.deployEnv === 'string' ? payload.deployEnv : null,
    expectedMigration:
      typeof db.expectedMigration === 'string' ? db.expectedMigration : null,
    appliedMigration:
      typeof db.appliedMigration === 'string' ? db.appliedMigration : null,
    appliedCount: typeof db.appliedCount === 'number' ? db.appliedCount : null,
    inSync: db.inSync === true,
  };
  const verified =
    state === 'UAT verified' ||
    state === 'UAT deployment verified' ||
    state === 'Production deployment verified' ||
    state === 'Production DB verified';
  return { ...body, verified };
}

export function verifyReleaseVersion(
  payload,
  expectedShaInput,
  sqlAppliedInput = '',
  targetEnvInput = 'uat',
  modeInput = 'release'
) {
  const expectedSha = (expectedShaInput || '').trim().toLowerCase();
  const sqlApplied = (sqlAppliedInput || '').trim();
  const targetEnv = (targetEnvInput || 'uat').trim();
  const mode = (modeInput || 'release').trim();
  const verifiedState =
    targetEnv === 'production' ? 'Production DB verified' : 'UAT verified';
  const pendingState = targetEnv === 'production' ? 'failed' : 'UAT schema pending';

  if (targetEnv !== 'uat' && targetEnv !== 'production') {
    return result('failed', 'target environment must be uat or production', null);
  }
  if (mode !== 'release' && mode !== 'preflight') {
    return result('failed', 'verification mode must be release or preflight', null);
  }

  if (!/^[0-9a-f]{40}$/.test(expectedSha)) {
    return result('failed', 'expected a version JSON path and a 40-character commit SHA', null);
  }

  if (!payload || typeof payload !== 'object' || !payload.db || typeof payload.db !== 'object') {
    return result('failed', 'version response is missing db status', payload);
  }

  if (payload.deployEnv !== targetEnv) {
    return result('failed', `endpoint deployEnv is not ${targetEnv}`, payload);
  }

  const gitSha =
    typeof payload.gitSha === 'string' ? payload.gitSha.trim().toLowerCase() : '';
  if (!/^[0-9a-f]{40}$/.test(gitSha)) {
    return result('failed', 'deployed gitSha is missing or not a full commit SHA', payload);
  }

  if (gitSha !== expectedSha) {
    return result(pendingState, 'deployed build is not the selected commit', payload);
  }

  const expected =
    typeof payload.db.expectedMigration === 'string' ? payload.db.expectedMigration : '';
  const applied =
    typeof payload.db.appliedMigration === 'string' ? payload.db.appliedMigration : '';
  if (!expected || !applied) {
    return result('failed', 'migration status is unavailable', payload);
  }

  // Before a migration changes a shared database, the selected deployment must
  // prove its identity and expose a usable schema-status response. It may be
  // out of sync at this point precisely because the migration has not run yet.
  if (mode === 'preflight') {
    return result(
      targetEnv === 'production' ? 'Production deployment verified' : 'UAT deployment verified',
      'deployment matches the selected commit',
      payload
    );
  }

  if (sqlApplied && applied !== sqlApplied) {
    return result('failed', 'endpoint applied migration does not match the database query', payload);
  }

  if (payload.db.inSync !== true || expected !== applied) {
    return result(pendingState, 'expected and applied migrations do not match', payload);
  }

  return result(verifiedState, 'expected and applied migrations match this build', payload);
}

function main() {
  const file = process.argv[2];
  let payload;
  try {
    payload = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    payload = null;
  }

  const verification = payload
    ? verifyReleaseVersion(payload, process.argv[3], process.argv[4], process.argv[5], process.argv[6])
    : result('failed', 'version response is not JSON', null);
  const { verified, ...body } = verification;
  process.stdout.write(`${JSON.stringify(body)}\n`);
  process.exit(verified ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
