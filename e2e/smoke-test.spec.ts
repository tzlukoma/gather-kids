import { test, expect } from '@playwright/test';

test.describe('Basic E2E Smoke Test', () => {
  test('can navigate to create account page', async ({ page }) => {
    console.log('🔍 Testing basic navigation and page structure');
    
    // Navigate to the create account page
    await page.goto('/create-account');
    
    // Log what we actually see on the page
    const pageTitle = await page.title();
    const pageURL = page.url();
    console.log(`Page title: "${pageTitle}"`);
    console.log(`Page URL: "${pageURL}"`);
    
    // Basic assertions that should always work
    expect(pageURL).toContain('/create-account');
    expect(pageTitle).toBe('gatherKids');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Get page content for debugging
    const bodyText = await page.locator('body').textContent();
    console.log(`Page content (first 200 chars): "${bodyText?.substring(0, 200)}..."`);
    
    // Look for any heading
    const headings = await page.locator('h1, h2, h3, [role="heading"]').allTextContents();
    console.log(`Found headings: ${JSON.stringify(headings)}`);
    
    // Just verify the page loads without client-side errors
    // This is a minimal test to verify browser configuration works
    const hasError = await page.locator('text=Application error').count() === 0;
    expect(hasError).toBeTruthy();
    
    console.log('✅ Basic page structure verified - browser launches correctly');
  });

  test('can navigate to registration page', async ({ page }) => {
    console.log('🔍 Testing registration page access');
    
    // Navigate to the registration page  
    await page.goto('/register');
    
    // Check that the page loads (might require auth, but should not crash)
    await page.waitForLoadState('networkidle');
    
    // The page should load, even if it redirects due to auth requirements
    const currentUrl = page.url();
    console.log(`Current URL after navigating to /register: ${currentUrl}`);
    
    console.log('✅ Registration page navigation test completed');
  });
});