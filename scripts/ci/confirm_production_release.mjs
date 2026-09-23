#!/usr/bin/env node

import { verifyReleaseVersion } from '../db/verify_release_version.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ATTEMPTS = 12;
const DEFAULT_INTERVAL_MS = 5_000;

function failure(reason, attempts, verification = {}) {
  return {
    ...verification,
    state: 'failed',
    reason,
    attempts,
    health: 'failed',
  };
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Wait for a production alias to serve the promoted deployment. The checks are
 * deliberately identical to the release gate; only alias propagation is retried.
 */
export async function confirmProductionRelease({
  baseUrl,
  expectedSha,
  appliedMigration,
  attempts = DEFAULT_ATTEMPTS,
  intervalMs = DEFAULT_INTERVAL_MS,
  request,
  sleep,
}) {
  const base = typeof baseUrl === 'string' ? baseUrl.replace(/\/$/, '') : '';
  if (!base.startsWith('https://') || !/^[0-9a-f]{40}$/i.test(expectedSha || '')) {
    return failure('expected an https production URL and a full commit SHA', 0);
  }

  let last = failure('production domain did not return a verified response', 0);
  const makeRequest = request || fetch;
  const wait = sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const versionResponse = await makeRequest(`${base}/api/version`, { cache: 'no-store' });
      if (!versionResponse.ok) {
        last = failure(`production /api/version returned HTTP ${versionResponse.status}`, attempt);
      } else {
        const payload = await readJson(versionResponse);
        const verification = verifyReleaseVersion(
          payload,
          expectedSha,
          appliedMigration,
          'production'
        );
        const { verified, ...details } = verification;
        if (!verified) {
          last = failure(details.reason, attempt, details);
        } else {
          const healthResponse = await makeRequest(`${base}/api/health`, { cache: 'no-store' });
          const health = await readJson(healthResponse);
          if (healthResponse.ok && health?.status === 'ok') {
            return {
              ...details,
              state: 'Production released',
              reason: 'production domain serves the verified build',
              attempts: attempt,
              health: 'ok',
            };
          }
          last = failure('GET /api/health did not return status ok after promotion', attempt, details);
        }
      }
    } catch {
      last = failure('production domain request failed after promotion', attempt);
    }

    if (attempt < attempts) await wait(intervalMs);
  }

  return failure(
    `production domain did not converge after ${attempts} attempts: ${last.reason}`,
    attempts,
    last
  );
}

async function main() {
  const [baseUrl, expectedSha, appliedMigration] = process.argv.slice(2);
  const result = await confirmProductionRelease({ baseUrl, expectedSha, appliedMigration });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(result.state === 'Production released' ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
