import { test, expect } from '@playwright/test';

test('Bible Bee enrollment repro', async ({ page }) => {
  const base = 'http://localhost:9002';
  const logs: string[] = [];
  page.on('console', msg => {
    logs.push(`[console:${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    logs.push(`[pageerror] ${err.message}`);
  });

  // Ensure we're authenticated: go to login and sign in with demo leader
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'leader.biblebee@example.com');
  await page.fill('#password', 'password');
  await page.click('button:has-text("Sign In")');
  // Wait for redirect to a dashboard page
  await page.waitForURL('**/dashboard/**', { timeout: 5000 });
  // Click the Bible Bee link in the left navigation (use broad text selector)
  await page.waitForSelector('text=Bible Bee', { timeout: 10000 });
  await page.click('text=Bible Bee');
  // Wait for Bible Bee page to load
  await page.waitForSelector('h1:has-text("Bible Bee")', { timeout: 10000 });

  // Click the Manage tab (use broad text selector)
  await page.waitForSelector('text=Manage', { timeout: 10000 });
  await page.click('text=Manage');

  // Click Add Year
  await page.waitForSelector('button:has-text("Add Year")', { timeout: 5000 });
  await page.click('button:has-text("Add Year")');

  // Fill form: label and active
  await page.fill('#year-label', 'Playwright Repro Year');
  await page.check('#is-active');

  // Submit create
  await page.click('button:has-text("Create")');

  // Ensure the new year is selected in the year select
  await page.waitForTimeout(500); // small delay for DB updates
  // Switch to Enrollment tab
  await page.click('button:has-text("Enrollment")');

  // Wait for evidence of preview or for console errors
  // The UI prints or renders previews; wait a few seconds while capturing logs
  await page.waitForTimeout(2000);

  // Dump logs
  console.log('--- Browser console logs (captured) ---');
  logs.forEach(l => console.log(l));
  console.log('--- End logs ---');

  // Optionally snapshot a visible preview element if present
  const previewExists = await page.locator('text=proposed').first().count();
  console.log('Preview proposed count (UI text heuristic):', previewExists);

  // Fail the test if a pageerror mentioning IDBKeyRange is present
  const idbError = logs.find(l => l.includes('IDBKeyRange') || l.includes('Failed to execute') || l.includes('DataError'));
  if (idbError) {
    console.error('Repro detected IDB error in browser logs:', idbError);
    throw new Error('Detected IDBKeyRange DataError in browser console. See logs above.');
  }
});
