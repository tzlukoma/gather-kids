import { defineConfig, devices } from '@playwright/test';

// Playwright config specifically for email verification tests with MailHog
export default defineConfig({
  testDir: 'tests/playwright/email',
  timeout: 60_000, // Increased timeout for email delivery
  expect: { timeout: 10_000 },
  fullyParallel: false, // Sequential execution for email tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'email-verification-tests',
      use: { 
        ...devices['Desktop Chrome'],
        // Use system Chrome browser instead of downloaded one
        channel: 'chrome',
      },
    },
  ],
  // Global setup for email tests
  globalSetup: './tests/playwright/email/global-setup.ts',
  globalTeardown: './tests/playwright/email/global-teardown.ts',
});