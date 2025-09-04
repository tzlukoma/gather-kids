import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:9002';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Registration tests may need sequential execution
  timeout: 60000, // Email confirmation can take time
  expect: { timeout: 10000 },
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
        // Use system browser instead of downloading
        launchOptions: {
          executablePath: '/usr/bin/chromium-browser'
        }
      }
    }
  ],
  // Global setup for seeding if needed
  // globalSetup: './e2e/utils/global-setup.ts',
});