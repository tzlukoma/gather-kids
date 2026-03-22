'use client';

import { useReportWebVitals } from 'next/dist/client/web-vitals';

/**
 * WebVitals — collects Core Web Vitals and logs them (or sends to an
 * analytics endpoint) when running in production.
 *
 * Usage: render once inside the root layout alongside other analytics
 * components. The component renders nothing visible.
 *
 * MAINT-02: Performance monitoring
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== 'production') return;

    // Log to console in development/staging; swap with a real endpoint call
    // in production (e.g. POST to /api/metrics or send to Vercel Analytics).
    // eslint-disable-next-line no-console
    console.debug('[WebVitals]', metric.name, metric.value);
  });

  return null;
}
