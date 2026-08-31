import { resolveSentryRelease } from '@/lib/sentry/release';
import { getSentryRelease } from '@/lib/sentry/runtime';

describe('resolveSentryRelease', () => {
  const originalEnv = {
    sentryRelease: process.env.SENTRY_RELEASE,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
  };

  afterEach(() => {
    if (originalEnv.sentryRelease === undefined) delete process.env.SENTRY_RELEASE;
    else process.env.SENTRY_RELEASE = originalEnv.sentryRelease;

    if (originalEnv.appVersion === undefined) delete process.env.NEXT_PUBLIC_APP_VERSION;
    else process.env.NEXT_PUBLIC_APP_VERSION = originalEnv.appVersion;
  });

  it('prefers SENTRY_RELEASE when set', () => {
    process.env.SENTRY_RELEASE = 'custom-release';
    expect(resolveSentryRelease()).toBe('custom-release');
  });

  it('ignores blank SENTRY_RELEASE', () => {
    process.env.SENTRY_RELEASE = '   ';
    expect(resolveSentryRelease()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('falls back to stamped build-info or package.json version', () => {
    delete process.env.SENTRY_RELEASE;
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    expect(resolveSentryRelease()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('matches getSentryRelease for SDK init', () => {
    expect(getSentryRelease()).toBe(resolveSentryRelease());
  });
});
