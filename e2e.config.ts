import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:9002';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Registration tests may need sequential execution
  timeout: 120000, // Increased timeout for slower operations
  expect: { timeout: 15000 }, // Increased expect timeout
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Sequential execution for better test isolation
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL,
    // Synthetic data is used in CI. Keep artifacts only when a test fails so
    // intermittent smoke failures have enough evidence to diagnose.
    trace: process.env.CI ? 'retain-on-failure' : 'off',
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
    video: 'off', // Disable video recording
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Prefer Playwright's bundled Chromium. If you need to use a
        // system-installed browser, set CHROMIUM_EXECUTABLE in the
        // environment to a valid path (useful for some CI images).
        launchOptions: process.env.CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
          : undefined
      }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    // Wait up to 90s for the server to start in slower environments
    timeout: 90_000,
    // Never reuse a local server for GatherSystem flag-on suites — an existing
    // `npm run dev` without OVERRIDE would serve the legacy registration page.
    reuseExistingServer:
      !process.env.CI && process.env.GATHERSYSTEM_REGISTRATION_E2E !== '1',
    env: {
      ...process.env,
      ...(process.env.GATHERSYSTEM_REGISTRATION_E2E === '1'
        ? { GATHERSYSTEM_REGISTRATION_OVERRIDE: 'true' }
        : {}),
    },
  },
  // Global setup for seeding if needed
  // globalSetup: './e2e/utils/global-setup.ts',
});
