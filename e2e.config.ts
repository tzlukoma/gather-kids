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
    trace: 'off', // Disable trace recording
    screenshot: 'off', // Disable screenshots
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
    // In CI we always start a fresh server; locally reuse existing to speed up dev
    reuseExistingServer: !process.env.CI,
  },
  // Global setup for seeding if needed
  // globalSetup: './e2e/utils/global-setup.ts',
});