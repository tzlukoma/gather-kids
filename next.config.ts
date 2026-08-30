import {withSentryConfig} from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingIncludes: {
    '/api/version': ['./src/generated/build-info.json'],
    '/help': ['./content/help/**/*', './CHANGELOG.md', './package.json'],
    '/help/[...slug]': ['./content/help/**/*', './package.json'],
    '/help/releases': ['./CHANGELOG.md', './package.json'],
    '/help/releases/[version]': ['./CHANGELOG.md', './package.json'],
  },
  devIndicators: {
    // allowedDevOrigins removed to satisfy Next.js config typing in this environment
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    // PERF-08: remotePatterns for next/image — covers placeholder images and Supabase Storage
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        // Supabase Storage: project logos uploaded by admins (project-specific subdomain)
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/**',
      },
      {
        // Local Supabase dev (via Kong gateway)
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/**',
      },
    ],
  },
  async redirects() {
    return [
      // Redirect /dashboard to /check-in (first admin/leader route)
      {
        source: '/dashboard',
        destination: '/check-in',
        permanent: false,
      },
      // Redirect /dashboard/:path* to /:path* (strip the /dashboard prefix)
      {
        source: '/dashboard/:path*',
        destination: '/:path*',
        permanent: false,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "gatherkids-app",

  project: "javascript-nextjs",

    // Sentry auth token:
    authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // gatherKids scheduled jobs run in GitHub Actions (daily-digest.yml), not Vercel Cron.
  // Keep the one free Sentry cron monitor for the daily digest check-in; do not auto-create Vercel monitors.
  automaticVercelMonitors: false,
});
