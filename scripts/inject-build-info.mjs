import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const outDir = path.join(process.cwd(), 'src', 'generated');
const outFile = path.join(outDir, 'build-info.json');

const info = {
  appVersion:
    process.env.NEXT_PUBLIC_APP_VERSION ||
    process.env.npm_package_version ||
    pkg.version,
  gitSha: (
    process.env.NEXT_PUBLIC_GIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    'local'
  ).slice(0, 7),
  gitRef: process.env.VERCEL_GIT_COMMIT_REF || 'local',
  deployEnv:
    process.env.NEXT_PUBLIC_DEPLOY_ENV ||
    process.env.VERCEL_ENV ||
    'development',
  builtAt: new Date().toISOString(),
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(info, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
