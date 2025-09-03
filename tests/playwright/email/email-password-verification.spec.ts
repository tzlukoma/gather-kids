import { test, expect } from '@playwright/test';
import { MailHogHelper } from '../utils/mailhog';
import { EmailPasswordRegistrationPage } from '../page-objects/email-password-registration.page';

test.describe('Email/Password Registration Flow with Email Verification', () => {
  let mailhog: MailHogHelper;
  let registrationPage: EmailPasswordRegistrationPage;

  test.beforeEach(async ({ page }) => {
    mailhog = new MailHogHelper();
    registrationPage = new EmailPasswordRegistrationPage(page);
    
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

  test('Complete email/password registration flow with email verification', async ({ page }) => {
    console.log('🚀 Starting complete email/password registration flow test');
    
    // Test data
    const testEmail = `test.${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
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
        }
      ]
    };

    // Step 1: Navigate to create account page
    console.log('📝 Step 1: Navigate to create account page');
    await registrationPage.navigateToCreateAccount();
    await expect(page).toHaveTitle(/.*[Cc]reate.*[Aa]ccount.*/);

    // Step 2: Create account with email and password
    console.log('🔐 Step 2: Create account with email and password');
    await registrationPage.fillAccountCreationForm(testEmail, testPassword);
    
    // Step 3: Submit account creation and check for verification requirement
    console.log('✉️ Step 3: Submit account creation');
    await registrationPage.submitAccountCreation();
    
    // Check if email verification is required
    const needsEmailVerification = await registrationPage.checkForEmailVerificationRequired();
    
    if (needsEmailVerification) {
      console.log('📧 Step 4: Email verification required - waiting for verification email');
      
      // Wait for verification email
      console.log('⏳ Waiting for verification email...');
      const email = await mailhog.getLatestEmail(30000, testEmail);
      
      // Verify email was received
      expect(email).toBeTruthy();
      expect(email.To.some(recipient => 
        `${recipient.Mailbox}@${recipient.Domain}`.toLowerCase() === testEmail.toLowerCase()
      )).toBeTruthy();
      
      console.log('📬 Verification email received, extracting verification link');
      
      // Extract and navigate to verification link
      const verificationLink = await mailhog.extractVerificationLink(email);
      expect(verificationLink).toBeTruthy();
      
      console.log('🔗 Navigating to verification link:', verificationLink);
      await page.goto(verificationLink, { waitUntil: 'networkidle' });
      
      // Wait for verification to process
      await page.waitForTimeout(3000);
      
      // Verify that email verification was successful
      await registrationPage.verifyEmailVerificationSuccess();
      
      console.log('✅ Email verification completed');
    } else {
      console.log('⚡ Step 4: No email verification required - proceeding directly');
    }

    // Step 5: Login with the verified account
    console.log('🔑 Step 5: Login with verified credentials');
    await registrationPage.navigateToLogin();
    await registrationPage.loginWithCredentials(testEmail, testPassword);
    
    // Step 6: Navigate to registration to complete family registration
    console.log('📋 Step 6: Navigate to family registration');
    await registrationPage.navigateToFamilyRegistration();
    
    // Step 7: Fill out family registration form
    console.log('📝 Step 7: Fill out family registration form');
    await registrationPage.fillFamilyRegistrationForm(registrationData, testEmail);

    // Step 8: Submit family registration
    console.log('✅ Step 8: Submit family registration');
    await registrationPage.submitFamilyRegistration();

    // Step 9: Verify registration success and parent portal access
    console.log('🎉 Step 9: Verify registration success');
    await registrationPage.verifyFamilyRegistrationSuccess();

    // Step 10: Verify we reach the parent portal/household page
    console.log('🏠 Step 10: Verify parent portal access');
    await registrationPage.verifyOnParentPortal();

    console.log('✅ Email/password registration flow completed successfully!');
  });

  test('Handle invalid password during account creation', async ({ page }) => {
    console.log('🚀 Testing invalid password handling');
    
    const testEmail = `invalid.${Date.now()}@example.com`;
    const weakPasswords = [
      '123', // Too short
      'password', // Too common
      'abcdefgh', // No numbers or special chars
      'PASSWORD123' // No lowercase
    ];
    
    await registrationPage.navigateToCreateAccount();
    
    for (const weakPassword of weakPasswords) {
      console.log(`🔍 Testing weak password: ${weakPassword}`);
      
      await registrationPage.fillAccountCreationForm(testEmail, weakPassword);
      await registrationPage.submitAccountCreation();
      
      // Should see password validation error
      const hasPasswordError = await registrationPage.checkForPasswordValidationError();
      expect(hasPasswordError).toBeTruthy();
      
      console.log('✅ Weak password correctly rejected');
      
      // Clear form for next test
      await page.fill('input[type="password"]', '');
    }
  });

  test('Handle expired verification link gracefully', async ({ page }) => {
    console.log('🚀 Testing expired verification link handling');
    
    const testEmail = `expired.${Date.now()}@example.com`;
    const testPassword = 'ValidPassword123!';
    
    // Create account
    await registrationPage.navigateToCreateAccount();
    await registrationPage.fillAccountCreationForm(testEmail, testPassword);
    await registrationPage.submitAccountCreation();

    // Check if email verification is required
    const needsEmailVerification = await registrationPage.checkForEmailVerificationRequired();
    
    if (needsEmailVerification) {
      // Wait for email
      const email = await mailhog.getLatestEmail(30000, testEmail);
      const verificationLink = await mailhog.extractVerificationLink(email);
      
      // Simulate expired link by adding invalid parameters
      const expiredLink = verificationLink + '&expired=true';
      await page.goto(expiredLink);
      
      // Should see error message about expired link
      const hasExpiredError = await registrationPage.checkForExpiredLinkError();
      expect(hasExpiredError).toBeTruthy();
      
      console.log('✅ Expired verification link handled correctly');
    } else {
      console.log('⚡ Skipping expired link test - no email verification required');
    }
  });

  test('Prevent login with unverified email account', async ({ page }) => {
    console.log('🚀 Testing unverified email login prevention');
    
    const testEmail = `unverified.${Date.now()}@example.com`;
    const testPassword = 'ValidPassword123!';
    
    // Create account but don't verify email
    await registrationPage.navigateToCreateAccount();
    await registrationPage.fillAccountCreationForm(testEmail, testPassword);
    await registrationPage.submitAccountCreation();

    // Check if email verification is required
    const needsEmailVerification = await registrationPage.checkForEmailVerificationRequired();
    
    if (needsEmailVerification) {
      // Skip verification and try to login directly
      await registrationPage.navigateToLogin();
      await registrationPage.loginWithCredentials(testEmail, testPassword);
      
      // Should be prevented from logging in or should see verification reminder
      const isLoginBlocked = await registrationPage.checkForUnverifiedEmailError();
      expect(isLoginBlocked).toBeTruthy();
      
      console.log('✅ Unverified email login correctly prevented');
    } else {
      console.log('⚡ Skipping unverified login test - no email verification required');
    }
  });

  test('Verify email content and formatting for verification emails', async ({ page }) => {
    console.log('🚀 Testing verification email content and formatting');
    
    const testEmail = `content.test.${Date.now()}@example.com`;
    const testPassword = 'ValidPassword123!';
    
    await registrationPage.navigateToCreateAccount();
    await registrationPage.fillAccountCreationForm(testEmail, testPassword);
    await registrationPage.submitAccountCreation();

    const needsEmailVerification = await registrationPage.checkForEmailVerificationRequired();
    
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
      expect(emailBody).toContain('Verify Your Email');
      expect(emailBody).toContain('verify');
      
      // Verify verification link is extractable
      const verificationLink = await mailhog.extractVerificationLink(email);
      expect(verificationLink).toMatch(/http.*verify|http.*confirm/);
      
      console.log('✅ Verification email content verification passed');
    } else {
      console.log('⚡ Skipping email content test - no email verification required');
    }
  });

  test('Resend verification email functionality', async ({ page }) => {
    console.log('🚀 Testing resend verification email');
    
    const testEmail = `resend.${Date.now()}@example.com`;
    const testPassword = 'ValidPassword123!';
    
    // Create account
    await registrationPage.navigateToCreateAccount();
    await registrationPage.fillAccountCreationForm(testEmail, testPassword);
    await registrationPage.submitAccountCreation();

    const needsEmailVerification = await registrationPage.checkForEmailVerificationRequired();
    
    if (needsEmailVerification) {
      // Clear first email
      await mailhog.clearAllEmails();
      
      // Use resend functionality
      const hasResendOption = await registrationPage.checkForResendVerificationOption();
      if (hasResendOption) {
        await registrationPage.clickResendVerification();
        
        // Wait for resent email
        const resentEmail = await mailhog.getLatestEmail(30000, testEmail);
        expect(resentEmail).toBeTruthy();
        
        // Verify it's a verification email
        expect(resentEmail.Content.Body).toContain('Verify');
        
        console.log('✅ Resend verification email worked correctly');
      } else {
        console.log('⚡ Resend option not available - skipping resend test');
      }
    } else {
      console.log('⚡ Skipping resend test - no email verification required');
    }
  });
});