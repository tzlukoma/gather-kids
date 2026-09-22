import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const outDir = path.join(process.cwd(), 'src', 'generated');
const outFile = path.join(outDir, 'build-info.json');
const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

function latestMigrationVersion(dir) {
  if (!fs.existsSync(dir)) return null;
  let best = null;
  let bestNum = -1n;
  for (const name of fs.readdirSync(dir)) {
    const match = name.match(/^(\d+)_.*\.sql$/);
    if (!match) continue;
    const n = BigInt(match[1]);
    if (n > bestNum) {
      bestNum = n;
      best = match[1];
    }
  }
  return best;
}

function stampGitSha(raw) {
  const gitSha = raw.trim() || 'local';
  const gitShaShort = /^[0-9a-f]{7,40}$/i.test(gitSha) ? gitSha.slice(0, 7) : gitSha;
  return { gitSha, gitShaShort };
}

const sha = stampGitSha(
  process.env.NEXT_PUBLIC_GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'local'
);

const info = {
  appVersion:
    process.env.NEXT_PUBLIC_APP_VERSION ||
    process.env.npm_package_version ||
    pkg.version,
  gitSha: sha.gitSha,
  gitShaShort: sha.gitShaShort,
  gitRef: process.env.VERCEL_GIT_COMMIT_REF || 'local',
  deployEnv:
    process.env.NEXT_PUBLIC_DEPLOY_ENV ||
    process.env.VERCEL_ENV ||
    'development',
  builtAt: new Date().toISOString(),
  expectedMigration: latestMigrationVersion(migrationsDir),
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(info, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
