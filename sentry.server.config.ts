// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import {
  getSentryDsn,
  getSentryEnvironment,
  getSentryRelease,
  shouldInitSentry,
} from '@/lib/sentry/runtime';
import { getSharedSentryRuntimeOptions } from '@/lib/sentry/sampling';
import { sentryBeforeSend } from '@/lib/sentry/scrub';

if (shouldInitSentry()) {
  const environment = getSentryEnvironment();

  Sentry.init({
    dsn: getSentryDsn(),
    environment,
    release: getSentryRelease(),
    ...getSharedSentryRuntimeOptions({ environment }),
    beforeSend: sentryBeforeSend,
    debug: false,
  });
}
