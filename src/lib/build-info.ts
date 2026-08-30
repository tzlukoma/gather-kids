import packageJson from '../../package.json';

export type BuildInfo = {
  appVersion: string;
  gitSha: string;
  gitRef: string;
  deployEnv: string;
  builtAt: string;
};

export const buildInfo: BuildInfo = {
  appVersion:
    process.env.NEXT_PUBLIC_APP_VERSION ?? packageJson.version,
  gitSha: (
    process.env.NEXT_PUBLIC_GIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    'local'
  ).slice(0, 7),
  gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? 'local',
  deployEnv:
    process.env.NEXT_PUBLIC_DEPLOY_ENV ??
    process.env.VERCEL_ENV ??
    'development',
  builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? '',
};

export function parseSupabaseProjectRef(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}
