import { test, expect } from '@playwright/test';

test.describe('Browser Configuration Verification', () => {
  test('browser launches correctly with system executable', async ({ page }) => {
    console.log('🔍 Testing browser executable configuration');
    
    // This test specifically verifies that the browser configuration issue is fixed
    // If the browser doesn't launch, this test will fail with the executable error
    
    // Navigate to the home page (should always work)
    await page.goto('/');
    
    // Basic assertions to verify browser is working
    const pageTitle = await page.title();
    const pageURL = page.url();
    
    console.log(`✅ Browser launched successfully`);
    console.log(`Page title: "${pageTitle}"`);
    console.log(`Page URL: "${pageURL}"`);
    
    // Verify we can interact with the page
    expect(pageTitle).toBe('gatherKids');
    expect(pageURL).toContain('localhost:9002');
    
    console.log('✅ Browser configuration working correctly');
  });

  test('routing configuration is correct', async ({ page }) => {
    console.log('🔍 Testing correct route usage');
    
    // Test that we use /create-account (not /auth/signup)
    await page.goto('/create-account');
    
    const pageURL = page.url();
    console.log(`Navigated to: ${pageURL}`);
    
    // Verify we're on the correct route
    expect(pageURL).toContain('/create-account');
    
    // Verify it's not the old incorrect route
    expect(pageURL).not.toContain('/auth/signup');
    
    console.log('✅ Correct route /create-account is accessible');
    
    // Test auth callback route exists
    await page.goto('/auth/callback');
    
    const callbackURL = page.url();
    console.log(`Auth callback route: ${callbackURL}`);
    
    // Should navigate to auth/callback (user mentioned this is the correct auth route)
    expect(callbackURL).toContain('/auth/callback');
    
    console.log('✅ Auth callback route /auth/callback is accessible');
  });
});