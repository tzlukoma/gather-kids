import { buildInfo } from '@/lib/build-info';
import {
  getSentryDsn,
  getSentryEnvironment,
  getSentryRelease,
  shouldInitSentry,
} from '@/lib/sentry/runtime';

describe('sentry runtime config', () => {
  const originalEnv = {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    deployEnv: process.env.NEXT_PUBLIC_DEPLOY_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  };

  afterEach(() => {
    if (originalEnv.dsn === undefined) delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    else process.env.NEXT_PUBLIC_SENTRY_DSN = originalEnv.dsn;

    if (originalEnv.deployEnv === undefined) delete process.env.NEXT_PUBLIC_DEPLOY_ENV;
    else process.env.NEXT_PUBLIC_DEPLOY_ENV = originalEnv.deployEnv;

    if (originalEnv.vercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalEnv.vercelEnv;
  });

  it('reads DSN from NEXT_PUBLIC_SENTRY_DSN', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://example.ingest.sentry.io/1';
    expect(getSentryDsn()).toBe('https://example.ingest.sentry.io/1');
  });

  it('treats a blank DSN as missing', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = '   ';
    expect(getSentryDsn()).toBeUndefined();
  });

  it('prefers NEXT_PUBLIC_DEPLOY_ENV over VERCEL_ENV', () => {
    process.env.NEXT_PUBLIC_DEPLOY_ENV = 'uat';
    process.env.VERCEL_ENV = 'preview';
    expect(getSentryEnvironment()).toBe('uat');
  });

  it('falls back to VERCEL_ENV', () => {
    delete process.env.NEXT_PUBLIC_DEPLOY_ENV;
    process.env.VERCEL_ENV = 'preview';
    expect(getSentryEnvironment()).toBe('preview');
  });

  it('defaults environment to development', () => {
    delete process.env.NEXT_PUBLIC_DEPLOY_ENV;
    delete process.env.VERCEL_ENV;
    expect(getSentryEnvironment()).toBe('development');
  });

  it('uses the stamped app version as release', () => {
    expect(getSentryRelease()).toBe(buildInfo.appVersion);
    expect(getSentryRelease()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('does not init when DSN is missing', () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    expect(shouldInitSentry()).toBe(false);
  });
});
