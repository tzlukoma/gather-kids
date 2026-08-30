// Browser Sentry init. Do not add sentry.client.config.ts — it is deprecated under Turbopack.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import {
  getSentryDsn,
  getSentryEnvironment,
  getSentryRelease,
  shouldInitSentry,
} from '@/lib/sentry/runtime';
import {
  getClientReplaySampleRates,
  getSharedSentryRuntimeOptions,
  SENTRY_REPLAY_MASKING,
} from '@/lib/sentry/sampling';
import { sentryBeforeSend } from '@/lib/sentry/scrub';

if (shouldInitSentry()) {
  const environment = getSentryEnvironment();

  Sentry.init({
    dsn: getSentryDsn(),
    environment,
    release: getSentryRelease(),

    integrations: [
      Sentry.replayIntegration({
        ...SENTRY_REPLAY_MASKING,
      }),
    ],

    ...getSharedSentryRuntimeOptions({ environment }),
    ...getClientReplaySampleRates(),
    beforeSend: sentryBeforeSend,
    debug: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
