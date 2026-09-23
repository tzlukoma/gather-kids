#!/usr/bin/env node

import { readFileSync } from 'node:fs';

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readPayload(payloadPath, context) {
  let payload;
  try {
    payload = JSON.parse(readFileSync(payloadPath, 'utf8'));
  } catch {
    fail(`Vercel ${context} returned invalid JSON.`);
  }
  return payload;
}

function immutableHostname(deployment) {
  const hostname = typeof deployment?.url === 'string' ? deployment.url.trim() : '';
  return /^[a-z0-9][a-z0-9-]*\.vercel\.app$/.test(hostname) && !hostname.includes('-git-');
}

function listCandidates(payload, expectedProjectId) {
  if (!Array.isArray(payload?.deployments)) {
    fail('Vercel deployment discovery did not return a deployments list.');
  }

  return payload.deployments.filter(
    (deployment) =>
      deployment?.target === 'production' &&
      deployment?.readyState === 'READY' &&
      deployment?.projectId === expectedProjectId &&
      immutableHostname(deployment)
  );
}

function detailedCandidate(payload, expectedSha, expectedProjectId) {
  const deployment = payload?.deployment ?? payload;
  const sha =
    typeof deployment?.meta?.githubCommitSha === 'string'
      ? deployment.meta.githubCommitSha.trim().toLowerCase()
      : '';

  return (
    deployment?.target === 'production' &&
    deployment?.readyState === 'READY' &&
    deployment?.projectId === expectedProjectId &&
    sha === expectedSha &&
    immutableHostname(deployment)
  )
    ? deployment
    : null;
}

const [mode, ...args] = process.argv.slice(2);

if (mode === 'list') {
  const [payloadPath, expectedProjectId] = args;
  if (!payloadPath || !expectedProjectId) {
    fail('expected a Vercel deployments JSON path and project ID.');
  }

  const candidates = listCandidates(readPayload(payloadPath, 'deployment discovery'), expectedProjectId);
  process.stdout.write(candidates.map((deployment) => deployment.url.trim()).join('\n'));
  if (candidates.length > 0) process.stdout.write('\n');
  process.exit(0);
}

if (mode !== 'select') {
  fail('expected discovery mode list or select.');
}

const [expectedShaInput, expectedProjectId, ...detailPaths] = args;
const expectedSha = (expectedShaInput || '').trim().toLowerCase();
if (!/^[0-9a-f]{40}$/.test(expectedSha) || !expectedProjectId || detailPaths.length === 0) {
  fail('expected a full 40-character commit SHA, project ID, and detailed deployment JSON.');
}

const candidates = detailPaths
  .map((payloadPath) => detailedCandidate(readPayload(payloadPath, 'deployment detail'), expectedSha, expectedProjectId))
  .filter(Boolean);

if (candidates.length !== 1) {
  fail(
    `expected exactly one ready immutable Production deployment for ${expectedSha}; found ${candidates.length}.`
  );
}

process.stdout.write(`https://${candidates[0].url.trim()}\n`);
