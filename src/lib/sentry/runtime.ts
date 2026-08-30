import { buildInfo } from '@/lib/build-info';

/** Ignore empty env vars (Vercel sometimes sets these to blank strings). */
function envValue(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  return value;
}

/** Public DSN only. Never put auth tokens here. */
export function getSentryDsn(): string | undefined {
  return envValue(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

/**
 * Deploy environment tag for Sentry.
 * Prefer `NEXT_PUBLIC_DEPLOY_ENV` (production | uat) then `VERCEL_ENV`
 * (production | preview | development).
 */
export function getSentryEnvironment(): string {
  return (
    envValue(process.env.NEXT_PUBLIC_DEPLOY_ENV) ||
    envValue(process.env.VERCEL_ENV) ||
    'development'
  );
}

/** Same app version stamped for `/api/version` (package.json / build-info). */
export function getSentryRelease(): string {
  return buildInfo.appVersion;
}

export function shouldInitSentry(): boolean {
  return process.env.NODE_ENV === 'production' && Boolean(getSentryDsn());
}
