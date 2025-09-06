import { test, expect } from '@playwright/test';
import { MailHogHelper } from '../utils/mailhog';
import { EmailRegistrationPage } from '../page-objects/email-registration.page';

test.describe('Registration Auth Flow with Email Verification', () => {
  let mailhog: MailHogHelper;
  let emailPage: EmailRegistrationPage;

  test.beforeEach(async ({ page }) => {
    mailhog = new MailHogHelper();
    emailPage = new EmailRegistrationPage(page);
    
    // Clear emails before each test
    await mailhog.clearAllEmails();
    
    // Set up console logging for debugging
    page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
    page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));
  });

  test.afterEach(async () => {
    // Clean up emails after each test
    try {
      await mailhog.clearAllEmails();
    } catch (error) {
      console.warn('Failed to cleanup emails:', error);
    }
  });

  test('Complete registration auth flow from email entry to parent portal', async ({ page }) => {
    console.log('🚀 Starting complete registration auth flow test');
    
    // Test data
    const testEmail = `test.${Date.now()}@example.com`;
    const registrationData = {
      householdName: `Test Family ${Date.now()}`,
      primaryGuardian: {
        firstName: 'John',
        lastName: 'TestUser',
        phone: '555-123-4567'
      },
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        zip: '90210'
      },
      children: [
        {
          firstName: 'Emma',
          lastName: 'TestUser',
          birthdate: '2015-05-15'
        },
        {
          firstName: 'Oliver',
          lastName: 'TestUser',
          birthdate: '2018-09-22'
        }
      ]
    };

    // Step 1: Navigate to registration page
    console.log('📝 Step 1: Navigate to registration page');
    await emailPage.navigateToRegistration();
    await expect(page).toHaveTitle(/.*[Rr]egist.*/);

    // Step 2: Enter email to start registration process
    console.log('📧 Step 2: Enter email for verification');
    await emailPage.enterEmailForVerification(testEmail);

    // Check if email verification is required
    const needsEmailVerification = await emailPage.checkForEmailVerificationStep();
    
    if (needsEmailVerification) {
      console.log('✉️  Step 3: Email verification required - waiting for magic link');
      
      // Wait for magic link email
      console.log('⏳ Waiting for verification email...');
      const email = await mailhog.getLatestEmail(30000, testEmail);
      
      // Verify email was received
      expect(email).toBeTruthy();
      expect(email.To.some(recipient => 
        `${recipient.Mailbox}@${recipient.Domain}`.toLowerCase() === testEmail.toLowerCase()
      )).toBeTruthy();
      
      console.log('📬 Email received, extracting magic link');
      
      // Extract and navigate to magic link
      const magicLink = await mailhog.extractMagicLink(email);
      expect(magicLink).toBeTruthy();
      
      console.log('🔗 Navigating to magic link:', magicLink);
      await page.goto(magicLink, { waitUntil: 'networkidle' });
      
      // Wait for auth callback to process
      await page.waitForTimeout(3000);
      
      // Check if we're redirected back to registration or if auth was successful
      const currentUrl = page.url();
      console.log('📍 Current URL after magic link:', currentUrl);
      
      // If redirected to register, we should now be authenticated
      if (currentUrl.includes('/register')) {
        console.log('🔄 Redirected back to registration - user is now authenticated');
      } else if (currentUrl.includes('/auth/callback')) {
        console.log('🔄 On auth callback page - waiting for redirect');
        await page.waitForTimeout(2000);
        // May need to continue to registration manually
        if (page.url().includes('/auth/callback')) {
          await page.goto('/register', { waitUntil: 'networkidle' });
        }
      }
    } else {
      console.log('⚡ Step 3: No email verification required - proceeding directly to form');
    }

    // Step 4: Fill out registration form
    console.log('📋 Step 4: Fill out registration form');
    await emailPage.fillRegistrationForm(registrationData);

    // Step 5: Submit registration
    console.log('✅ Step 5: Submit registration');
    await emailPage.submitRegistration();

    // Step 6: Verify registration success
    console.log('🎉 Step 6: Verify registration success');
    await emailPage.verifyRegistrationSuccess();

    // Step 7: Verify we reach the parent portal/household page
    console.log('🏠 Step 7: Verify parent portal access');
    await emailPage.verifyOnParentPortal();

    console.log('✅ Registration auth flow completed successfully!');
  });

  test('Handle expired magic link gracefully', async ({ page }) => {
    console.log('🚀 Testing expired magic link handling');
    
    const testEmail = `expired.${Date.now()}@example.com`;
    
    // Navigate to registration
    await emailPage.navigateToRegistration();
    await emailPage.enterEmailForVerification(testEmail);

    // Check if email verification is required
    const needsEmailVerification = await emailPage.checkForEmailVerificationStep();
    
    if (needsEmailVerification) {
      // Wait for email
      const email = await mailhog.getLatestEmail(30000, testEmail);
      const magicLink = await mailhog.extractMagicLink(email);
      
      // Simulate expired link by adding invalid parameters or waiting
      const expiredLink = magicLink + '&expired=true';
      await page.goto(expiredLink);
      
      // Should see error message about expired link
      const errorIndicators = [
        'text=expired',
        'text=invalid',
        'text=Error',
        '[role="alert"]'
      ];
      
      let foundError = false;
      for (const selector of errorIndicators) {
        if (await page.locator(selector).count() > 0) {
          foundError = true;
          break;
        }
      }
      
      expect(foundError).toBeTruthy();
      console.log('✅ Expired link handled correctly');
    } else {
      console.log('⚡ Skipping expired link test - no email verification required');
    }
  });

  test('Handle invalid email format gracefully', async ({ page }) => {
    console.log('🚀 Testing invalid email handling');
    
    const invalidEmails = [
      'invalid-email',
      '@domain.com',
      'user@',
      'user space@domain.com'
    ];
    
    await emailPage.navigateToRegistration();
    
    for (const invalidEmail of invalidEmails) {
      console.log(`🔍 Testing invalid email: ${invalidEmail}`);
      
      // Try to enter invalid email
      await page.fill('input[type="email"]', invalidEmail);
      await page.click('button:has-text("Continue")');
      
      // Should see validation error or prevent submission
      const hasValidationError = await page.locator('.error, [role="alert"], .invalid').count() > 0;
      const emailInput = page.locator('input[type="email"]');
      const isValidByBrowser = await emailInput.evaluate((input: HTMLInputElement) => input.validity.valid);
      
      // Either browser validation or custom validation should catch this
      expect(hasValidationError || !isValidByBrowser).toBeTruthy();
      
      // Clear for next test
      await page.fill('input[type="email"]', '');
    }
    
    console.log('✅ Invalid email formats handled correctly');
  });

  test('Verify email content and formatting', async ({ page }) => {
    console.log('🚀 Testing email content and formatting');
    
    const testEmail = `content.test.${Date.now()}@example.com`;
    
    await emailPage.navigateToRegistration();
    await emailPage.enterEmailForVerification(testEmail);

    const needsEmailVerification = await emailPage.checkForEmailVerificationStep();
    
    if (needsEmailVerification) {
      // Wait for email
      const email = await mailhog.getLatestEmail(30000, testEmail);
      
      // Verify email structure
      expect(email.Content.Headers.Subject).toBeTruthy();
      expect(email.Content.Body).toBeTruthy();
      expect(email.From.Mailbox).toBeTruthy();
      
      // Verify email content contains expected elements
      const emailBody = email.Content.Body;
      expect(emailBody).toContain('gatherKids');
      expect(emailBody).toContain('Complete Your Registration');
      expect(emailBody).toContain('auth/callback');
      
      // Verify magic link is extractable
      const magicLink = await mailhog.extractMagicLink(email);
      expect(magicLink).toMatch(/http.*auth.*callback/);
      
      console.log('✅ Email content verification passed');
    } else {
      console.log('⚡ Skipping email content test - no email verification required');
    }
  });

  test('Multiple email registrations with cleanup', async ({ page }) => {
    console.log('🚀 Testing multiple registrations with cleanup');
    
    const testUsers = [
      `user1.${Date.now()}@example.com`,
      `user2.${Date.now()}@example.com`,
      `user3.${Date.now()}@example.com`
    ];
    
    for (let i = 0; i < testUsers.length; i++) {
      const email = testUsers[i];
      console.log(`👤 Testing registration ${i + 1}/3 for ${email}`);
      
      // Clear emails before each user
      await mailhog.clearAllEmails();
      
      await emailPage.navigateToRegistration();
      await emailPage.enterEmailForVerification(email);
      
      const needsEmailVerification = await emailPage.checkForEmailVerificationStep();
      
      if (needsEmailVerification) {
        // Verify only one email per user
        await page.waitForTimeout(2000); // Wait a bit to ensure email is sent
        const emailCount = await mailhog.getEmailCount();
        expect(emailCount).toBe(1);
        
        const receivedEmail = await mailhog.getLatestEmail(10000, email);
        expect(receivedEmail).toBeTruthy();
        
        console.log(`✅ Email sent correctly for user ${i + 1}`);
      }
      
      // Clear emails after verification
      await mailhog.clearAllEmails();
    }
    
    // Final verification that all emails are cleaned up
    const finalEmailCount = await mailhog.getEmailCount();
    expect(finalEmailCount).toBe(0);
    
    console.log('✅ Multiple registrations and cleanup completed successfully');
  });
});