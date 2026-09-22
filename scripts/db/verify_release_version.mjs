#!/usr/bin/env node
/**
 * Decide whether a deployed /api/version payload is UAT verified for a
 * selected commit. Prints one JSON object on stdout. Exits 0 only for
 * `UAT verified`.
 *
 * Usage: node scripts/db/verify_release_version.mjs <version.json> <sha> [sqlAppliedVersion] [uat|production] [preflight]
 */
import { readFileSync } from 'node:fs';

function emit(state, reason, payload) {
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
  process.stdout.write(`${JSON.stringify(body)}\n`);
  const verified =
    state === 'UAT verified' ||
    state === 'UAT deployment verified' ||
    state === 'Production DB verified';
  process.exit(verified ? 0 : 1);
}

function main() {
  const file = process.argv[2];
  const expectedSha = (process.argv[3] || '').trim().toLowerCase();
  const sqlApplied = (process.argv[4] || '').trim();
  const targetEnv = (process.argv[5] || 'uat').trim();
  const mode = (process.argv[6] || 'release').trim();
  const verifiedState =
    targetEnv === 'production' ? 'Production DB verified' : 'UAT verified';
  const pendingState = targetEnv === 'production' ? 'failed' : 'UAT schema pending';

  if (targetEnv !== 'uat' && targetEnv !== 'production') {
    emit('failed', 'target environment must be uat or production', null);
  }
  if (mode !== 'release' && mode !== 'preflight') {
    emit('failed', 'verification mode must be release or preflight', null);
  }

  if (!file || !/^[0-9a-f]{40}$/.test(expectedSha)) {
    emit('failed', 'expected a version JSON path and a 40-character commit SHA', null);
  }

  let payload;
  try {
    payload = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    emit('failed', 'version response is not JSON', null);
  }

  if (!payload || typeof payload !== 'object' || !payload.db || typeof payload.db !== 'object') {
    emit('failed', 'version response is missing db status', payload);
  }

  if (payload.deployEnv !== targetEnv) {
    emit('failed', `endpoint deployEnv is not ${targetEnv}`, payload);
  }

  const gitSha =
    typeof payload.gitSha === 'string' ? payload.gitSha.trim().toLowerCase() : '';
  if (!/^[0-9a-f]{40}$/.test(gitSha)) {
    emit('failed', 'deployed gitSha is missing or not a full commit SHA', payload);
  }

  if (gitSha !== expectedSha) {
    emit(pendingState, 'deployed build is not the selected commit', payload);
  }

  const expected =
    typeof payload.db.expectedMigration === 'string' ? payload.db.expectedMigration : '';
  const applied =
    typeof payload.db.appliedMigration === 'string' ? payload.db.appliedMigration : '';
  if (!expected || !applied) {
    emit('failed', 'migration status is unavailable', payload);
  }

  // Before a UAT migration changes the database, the selected deployment must
  // prove its identity and expose a usable schema-status response. It may be
  // out of sync at this point precisely because the migration has not run yet.
  if (mode === 'preflight') {
    emit('UAT deployment verified', 'deployment matches the selected commit', payload);
  }

  if (sqlApplied && applied !== sqlApplied) {
    emit('failed', 'endpoint applied migration does not match the database query', payload);
  }

  if (payload.db.inSync !== true || expected !== applied) {
    emit(pendingState, 'expected and applied migrations do not match', payload);
  }

  emit(verifiedState, 'expected and applied migrations match this build', payload);
}

main();
