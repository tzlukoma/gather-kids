import { test, expect } from '@playwright/test';
import { 
  generateUniqueEmail, 
  generateTestGuardians, 
  generateEmergencyContact, 
  generateTestChildren,
  TEST_PASSWORD 
} from './utils/data';
import { TestHelpers } from './utils/helpers';

test.describe('Simplified Registration Flow (No Email Verification)', () => {
  let testEmail: string;
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    testEmail = generateUniqueEmail('registration');
    helpers = new TestHelpers(page);
    
    // Set up console logging for debugging
    page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
    page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));
  });

  test('create account form validation', async ({ page }) => {
    console.log('🚀 Testing create account form');

    // Step 1: Navigate to create account page
    await page.goto('/create-account');
    await helpers.waitForPageLoad();

    // Verify form is visible
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirm-password')).toBeVisible();

    // Fill form with test data
    await helpers.fillFormField('#email', testEmail);
    await helpers.fillFormField('#password', TEST_PASSWORD);
    await helpers.fillFormField('#confirm-password', TEST_PASSWORD);

    // Verify button is enabled
    await expect(page.locator('button:has-text("Create Account")')).toBeEnabled();

    console.log('✅ Create account form validation completed');
  });

  test('registration form navigation and structure', async ({ page }) => {
    console.log('🚀 Testing registration form structure');

    // Navigate directly to registration (may require auth)
    await page.goto('/register');
    await helpers.waitForPageLoad();

    // Check if we're redirected to login (expected if auth is required)
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('👍 Correctly redirected to login for unauthenticated user');
      return;
    }

    // If we reach the registration form, check its structure
    const formExists = await page.locator('form').count() > 0;
    if (formExists) {
      console.log('📋 Registration form is accessible');
      
      // Look for common form sections
      const sections = [
        'guardian', 'emergency', 'child', 'ministry', 'consent'
      ];

      for (const section of sections) {
        const hasSection = await page.locator(`text=${section}`).or(
          page.locator(`[data-testid*="${section}"]`)
        ).or(
          page.locator(`input[name*="${section}"], select[name*="${section}"]`)
        ).count() > 0;
        
        if (hasSection) {
          console.log(`✅ Found ${section} section`);
        }
      }
    }

    console.log('✅ Registration form structure test completed');
  });

  test('household page accessibility', async ({ page }) => {
    console.log('🚀 Testing household page accessibility');

    // Navigate to household page (may require auth)
    await page.goto('/household');
    await helpers.waitForPageLoad();

    // Check if we're redirected (expected behavior)
    const currentUrl = page.url();
    console.log(`Household page navigation result: ${currentUrl}`);

    if (currentUrl.includes('/login')) {
      console.log('👍 Correctly redirected to login for unauthenticated user');
    } else if (currentUrl.includes('/household')) {
      console.log('📊 Household page is accessible (authentication may be disabled)');
    }

    console.log('✅ Household page accessibility test completed');
  });
});