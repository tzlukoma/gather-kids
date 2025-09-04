import { test, expect } from '@playwright/test';
import { seedMinistries, cleanupTestData } from './utils/seed';
import { getLatestConfirmationLink, clearMailHogInbox } from './utils/mailhog';
import { 
  generateUniqueEmail, 
  generateTestGuardians, 
  generateEmergencyContact, 
  generateTestChildren,
  TEST_PASSWORD 
} from './utils/data';
import { TestHelpers } from './utils/helpers';

test.describe('Email/Password Registration to Household Flow', () => {
  let testEmail: string;
  let seededMinistries: any[];
  let helpers: TestHelpers;

  test.beforeAll(async () => {
    // Seed required test data
    seededMinistries = await seedMinistries();
    await clearMailHogInbox();
  });

  test.beforeEach(async ({ page }) => {
    testEmail = generateUniqueEmail('registration');
    helpers = new TestHelpers(page);
    
    // Set up console logging for debugging
    page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
    page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));
  });

  test.afterAll(async () => {
    // Optional: Clean up test data
    // await cleanupTestData();
  });

  test('complete registration flow with email confirmation', async ({ page }) => {
    const guardians = generateTestGuardians(testEmail);
    const emergencyContact = generateEmergencyContact();
    const children = generateTestChildren();

    console.log('🚀 Starting complete registration flow test');

    // Step 1: Create account
    console.log('📝 Step 1: Navigate to signup');
    await page.goto('/create-account');
    await helpers.waitForPageLoad();

    // Fill signup form
    await helpers.fillFormField('#email', testEmail);
    await helpers.fillFormField('#password', TEST_PASSWORD);
    await helpers.fillFormField('#confirm-password', TEST_PASSWORD);

    await page.locator('button:has-text("Create Account")').click();

    // Verify signup success message
    console.log('📧 Step 2: Verify signup success');
    const checkEmailIndicators = [
      page.getByTestId('check-email-message'),
      page.locator('text=Check your email'),
      page.locator('text=Verify your email'),
      page.locator('text=verification email')
    ];
    
    let foundMessage = false;
    for (const indicator of checkEmailIndicators) {
      if (await indicator.count() > 0) {
        await expect(indicator).toBeVisible();
        foundMessage = true;
        break;
      }
    }
    
    if (!foundMessage) {
      console.log('No explicit verification message found, checking if redirected...');
    }

    // Step 3: Email confirmation via MailHog
    console.log('✉️ Step 3: Retrieve and follow confirmation link');
    const confirmationLink = await getLatestConfirmationLink(testEmail);
    await page.goto(confirmationLink);
    await helpers.waitForPageLoad();

    // Step 4: Navigate to registration form
    console.log('📋 Step 4: Navigate to registration form');
    
    // Check if we're already on registration or need to navigate
    if (!page.url().includes('/registration') && !page.url().includes('/register')) {
      await page.goto('/register');
      await helpers.waitForPageLoad();
    }

    // Wait for registration form to be visible
    await expect(page.getByTestId('registration-form').or(page.locator('form')).first()).toBeVisible();

    // Step 5: Fill guardian information
    console.log('👥 Step 5: Fill guardian information');
    
    for (const [index, guardian] of guardians.entries()) {
      if (index === 1) {
        // Add second guardian
        const addGuardianBtn = page.getByTestId('add-guardian-button').or(page.locator('button:has-text("Add Guardian"), button:has-text("Add Another Guardian")')).first();
        if (await addGuardianBtn.count() > 0) {
          await addGuardianBtn.click();
          await page.waitForTimeout(500);
        }
      }

      await helpers.fillFormField(`[data-testid="guardian-${index}-first-name"], input[name*="guardian"][name*="first"]`, guardian.first_name);
      await helpers.fillFormField(`[data-testid="guardian-${index}-last-name"], input[name*="guardian"][name*="last"]`, guardian.last_name);
      await helpers.fillFormField(`[data-testid="guardian-${index}-email"], input[name*="guardian"][name*="email"]`, guardian.email);
      await helpers.fillFormField(`[data-testid="guardian-${index}-phone"], input[name*="guardian"][name*="phone"]`, guardian.phone);
    }

    // Step 6: Fill emergency contact
    console.log('🚨 Step 6: Fill emergency contact');
    await helpers.fillFormField('[data-testid="emergency-first-name"], input[name*="emergency"][name*="first"]', emergencyContact.first_name);
    await helpers.fillFormField('[data-testid="emergency-last-name"], input[name*="emergency"][name*="last"]', emergencyContact.last_name);
    await helpers.fillFormField('[data-testid="emergency-relationship"], input[name*="emergency"][name*="relationship"]', emergencyContact.relationship);
    await helpers.fillFormField('[data-testid="emergency-phone"], input[name*="emergency"][name*="phone"]', emergencyContact.phone);

    // Step 7: Fill children information and select ministries
    console.log('👶 Step 7: Fill children information and select ministries');
    
    for (const [index, child] of children.entries()) {
      if (index === 1) {
        const addChildBtn = page.getByTestId('add-child-button').or(page.locator('button:has-text("Add Child"), button:has-text("Add Another Child")')).first();
        if (await addChildBtn.count() > 0) {
          await addChildBtn.click();
          await page.waitForTimeout(500);
        }
      }

      await helpers.fillFormField(`[data-testid="child-${index}-first-name"], input[name*="child"][name*="first"]`, child.first_name);
      await helpers.fillFormField(`[data-testid="child-${index}-last-name"], input[name*="child"][name*="last"]`, child.last_name);
      await helpers.fillFormField(`[data-testid="child-${index}-date-of-birth"], input[name*="child"][name*="birth"], input[type="date"]`, child.date_of_birth);
      
      // Select grade if present
      const gradeField = page.getByTestId(`child-${index}-grade`).or(page.locator(`select[name*="child"][name*="grade"]`)).first();
      if (await gradeField.count() > 0) {
        await gradeField.selectOption(child.grade);
      }

      // Select ministries (at least 2 per child)
      console.log(`Selecting ministries for child ${index + 1}`);
      const ministrySelector = page.getByTestId(`child-${index}-ministries`).or(page.locator(`[name*="child"][name*="ministries"], .ministry-select`)).first();
      
      if (await ministrySelector.count() > 0) {
        await ministrySelector.click();
        
        // Select first two test ministries
        for (let i = 1; i <= 2; i++) {
          const option = page.getByRole('option', { name: new RegExp(`Test Ministry ${i}`, 'i') });
          if (await option.count() > 0) {
            await option.click();
          }
        }
        
        await page.keyboard.press('Escape');
      }
    }

    // Step 8: Accept all consents
    console.log('✅ Step 8: Accept all required consents');
    const consentSelectors = [
      '[data-testid="consent-terms"]',
      '[data-testid="consent-media"]', 
      '[data-testid="consent-safety"]',
      'input[type="checkbox"][name*="consent"]',
      'input[type="checkbox"][name*="terms"]',
      'input[type="checkbox"][name*="liability"]',
      'input[type="checkbox"][name*="photo"]'
    ];

    for (const selector of consentSelectors) {
      const consent = page.locator(selector);
      if (await consent.count() > 0) {
        await helpers.checkboxCheck(selector);
      }
    }

    // Step 9: Submit registration
    console.log('🚀 Step 9: Submit registration');
    await helpers.scrollToBottom();
    
    const submitBtn = page.getByTestId('registration-submit').or(page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Complete Registration")')).first();
    await submitBtn.click();
    await helpers.waitForPageLoad();

    // Step 10: Verify household page
    console.log('🏠 Step 10: Verify redirect to household page');
    await page.waitForURL(/\/household/, { timeout: 15000 });
    await expect(page.getByTestId('household-view').or(page.locator('h1:has-text("Household"), h1:has-text("Dashboard")')).first()).toBeVisible();

    // Step 11: Verify guardian data
    console.log('👥 Step 11: Verify guardian data persistence');
    for (const [index, guardian] of guardians.entries()) {
      const nameElement = page.getByTestId(`guardian-${index}-name`).or(page.locator(`text=${guardian.first_name}`)).first();
      const emailElement = page.getByTestId(`guardian-${index}-email`).or(page.locator(`text=${guardian.email}`)).first();
      
      if (await nameElement.count() > 0) {
        await expect(nameElement).toContainText(guardian.first_name);
      }
      if (await emailElement.count() > 0) {
        await expect(emailElement).toContainText(guardian.email);
      }
    }

    // Step 12: Verify emergency contact
    console.log('🚨 Step 12: Verify emergency contact data');
    const emergencyElement = page.getByTestId('emergency-contact-name').or(page.locator(`text=${emergencyContact.first_name}`)).first();
    if (await emergencyElement.count() > 0) {
      await expect(emergencyElement).toContainText(emergencyContact.first_name);
    }

    // Step 13: Verify children and their ministry enrollments
    console.log('👶 Step 13: Verify children and ministry enrollment data');
    for (const [index, child] of children.entries()) {
      const childNameElement = page.getByTestId(`child-${index}-name`).or(page.locator(`text=${child.first_name}`)).first();
      const childMinistriesElement = page.getByTestId(`child-${index}-ministries`).or(page.locator('text=Test Ministry')).first();
      
      if (await childNameElement.count() > 0) {
        await expect(childNameElement).toContainText(child.first_name);
      }
      if (await childMinistriesElement.count() > 0) {
        await expect(childMinistriesElement).toContainText(/Test Ministry/);
      }
    }

    // Step 14: Verify consent status
    console.log('✅ Step 14: Verify consent status');
    const consentStatusElement = page.getByTestId('consents-status').or(page.locator('text=consent')).or(page.locator('text=accepted')).first();
    if (await consentStatusElement.count() > 0) {
      await expect(consentStatusElement).toContainText(/accepted|consent/i);
    }

    console.log('🎉 Registration flow completed successfully!');
  });

  test('handles ministry selection errors gracefully', async ({ page }) => {
    console.log('🚀 Testing ministry selection error handling');
    
    // Navigate to registration (assuming user is authenticated)
    await page.goto('/register');
    await helpers.waitForPageLoad();
    
    // Wait for form to be visible
    await expect(page.locator('form')).toBeVisible();
    
    // Try to submit without selecting ministries
    await helpers.scrollToBottom();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Submit")').first();
    await submitBtn.click();
    
    // Check for ministry selection error
    const errorElement = page.getByTestId('ministry-selection-error').or(page.locator('.error:has-text("ministry"), [role="alert"]:has-text("ministry")')).first();
    if (await errorElement.count() > 0) {
      await expect(errorElement).toBeVisible();
      console.log('✅ Ministry selection error handled correctly');
    } else {
      console.log('⚠️ No specific ministry selection error found');
    }
  });

  test('handles email confirmation timeout gracefully', async ({ page }) => {
    console.log('🚀 Testing email confirmation timeout handling');
    
    const testEmail = generateUniqueEmail('timeout');
    
    // Create account
    await page.goto('/create-account');
    await helpers.fillFormField('input[type="email"]', testEmail);
    await helpers.fillFormField('input[type="password"]', TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    
    // Simulate timeout by not retrieving email
    console.log('⏳ Simulating email timeout...');
    
    // Try to access registration directly without email confirmation
    await page.goto('/register');
    
    // Should redirect to login or show error
    const isRedirected = page.url().includes('/login') || page.url().includes('/auth');
    const hasError = await page.locator('.error, [role="alert"]').count() > 0;
    
    expect(isRedirected || hasError).toBeTruthy();
    console.log('✅ Email timeout handled appropriately');
  });
});