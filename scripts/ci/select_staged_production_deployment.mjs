#!/usr/bin/env node

import { readFileSync } from 'node:fs';

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const [payloadPath, expectedShaInput, expectedProjectId, expectedTeamId] = process.argv.slice(2);
const expectedSha = (expectedShaInput || '').trim().toLowerCase();

if (!payloadPath || !/^[0-9a-f]{40}$/.test(expectedSha)) {
  fail('expected a Vercel deployments JSON path and a full 40-character commit SHA.');
}

let payload;
try {
  payload = JSON.parse(readFileSync(payloadPath, 'utf8'));
} catch {
  fail('Vercel deployment discovery returned invalid JSON.');
}

if (!Array.isArray(payload?.deployments)) {
  fail('Vercel deployment discovery did not return a deployments list.');
}

const candidates = payload.deployments.filter((deployment) => {
  const sha = typeof deployment?.meta?.githubCommitSha === 'string'
    ? deployment.meta.githubCommitSha.trim().toLowerCase()
    : '';
  const hostname = typeof deployment?.url === 'string' ? deployment.url.trim() : '';
  const immutableHostname =
    /^[a-z0-9][a-z0-9-]*\.vercel\.app$/.test(hostname) && !hostname.includes('-git-');

  return (
    deployment?.target === 'production' &&
    deployment?.readyState === 'READY' &&
    deployment?.projectId === expectedProjectId &&
    deployment?.teamId === expectedTeamId &&
    sha === expectedSha &&
    immutableHostname
  );
});

if (candidates.length !== 1) {
  fail(
    `expected exactly one ready immutable Production deployment for ${expectedSha}; found ${candidates.length}.`
  );
}

process.stdout.write(`https://${candidates[0].url}\n`);
