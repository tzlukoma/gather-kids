import packageJson from '../../../package.json';
import generatedBuildInfo from '../../generated/build-info.json';

/** Ignore empty env vars (Vercel sometimes sets these to blank strings). */
function envValue(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  return value;
}

/**
 * Shared Sentry release name for SDK init and webpack source-map upload.
 * Prefer `SENTRY_RELEASE`, then prebuild-stamped `build-info.json`, then package.json.
 */
export function resolveSentryRelease(): string {
  return (
    envValue(process.env.SENTRY_RELEASE) ||
    generatedBuildInfo.appVersion ||
    envValue(process.env.NEXT_PUBLIC_APP_VERSION) ||
    packageJson.version
  );
}
