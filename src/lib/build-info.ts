import packageJson from '../../package.json';
import generatedBuildInfoJson from '../generated/build-info.json';

type GeneratedBuildInfo = {
  appVersion?: string;
  gitSha?: string;
  gitRef?: string;
  deployEnv?: string;
  builtAt?: string;
  expectedMigration?: string | null;
};

const generatedBuildInfo = generatedBuildInfoJson as GeneratedBuildInfo;

export type BuildInfo = {
  appVersion: string;
  gitSha: string;
  gitRef: string;
  deployEnv: string;
  builtAt: string;
  /** Supabase migration version stamped from supabase/migrations at build time. */
  expectedMigration: string | null;
};

/** Ignore empty env vars (Vercel sometimes sets these to blank strings). */
function envValue(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  return value;
}

/**
 * Build metadata captured at `prebuild` time (see scripts/inject-build-info.mjs).
 * Prefer this snapshot over runtime env so /api/version reflects the deploy that was built.
 */
export const buildInfo: BuildInfo = {
  appVersion:
    generatedBuildInfo.appVersion ||
    envValue(process.env.NEXT_PUBLIC_APP_VERSION) ||
    packageJson.version,
  gitSha: (
    generatedBuildInfo.gitSha ||
    envValue(process.env.NEXT_PUBLIC_GIT_SHA) ||
    envValue(process.env.VERCEL_GIT_COMMIT_SHA) ||
    'local'
  ).slice(0, 7),
  gitRef:
    generatedBuildInfo.gitRef ||
    envValue(process.env.VERCEL_GIT_COMMIT_REF) ||
    'local',
  deployEnv:
    generatedBuildInfo.deployEnv ||
    envValue(process.env.NEXT_PUBLIC_DEPLOY_ENV) ||
    envValue(process.env.VERCEL_ENV) ||
    'development',
  builtAt: generatedBuildInfo.builtAt || envValue(process.env.NEXT_PUBLIC_BUILD_TIME) || '',
  expectedMigration: envValue(generatedBuildInfo.expectedMigration ?? undefined) ?? null,
};

export function parseSupabaseProjectRef(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}
