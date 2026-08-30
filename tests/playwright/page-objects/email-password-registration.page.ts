import { Page, expect } from '@playwright/test';
import {
  fillHouseholdRegistrationForm,
  type HouseholdFormData,
} from '../utils/fill-household-form';

export class EmailPasswordRegistrationPage {
  constructor(private page: Page) {}

  async navigateToCreateAccount() {
    await this.page.goto('/create-account', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('button', { name: /create account/i })).toBeVisible({
      timeout: 30000,
    });
  }

  async navigateToLogin() {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
  }

  async navigateToFamilyRegistration() {
    await this.page.goto('/register', { waitUntil: 'domcontentloaded' });
    await expect(
      this.page
        .locator('input[name="guardians.0.first_name"]')
        .or(this.page.getByText('Household Lookup'))
    ).toBeVisible({
      timeout: 30000,
    });
  }

  async fillAccountCreationForm(email: string, password: string) {
    await expect(this.page.locator('input[type="email"]').first()).toBeVisible({
      timeout: 30000,
    });
    await this.page.fill('input[type="email"]', email);
    
    // Fill password field
    await this.page.fill('input[type="password"]:not([name*="confirm"])', password);
    
    // Fill confirm password field
    const confirmPasswordField = this.page.locator('input[type="password"][name*="confirm"], input[type="password"]').last();
    await confirmPasswordField.fill(password);
    
    // Wait for form validation
    await this.page.waitForTimeout(500);
  }

  async submitAccountCreation() {
    // Look for create account/register/sign up buttons
    const submitButtons = [
      'button[type="submit"]',
      'button:has-text("Create Account")',
      'button:has-text("Sign Up")',
      'button:has-text("Register")',
      'button:has-text("Create")'
    ];

    let submitted = false;
    for (const selector of submitButtons) {
      const button = this.page.locator(selector);
      if (await button.count() > 0 && await button.isVisible()) {
        await button.click();
        submitted = true;
        break;
      }
    }

    if (!submitted) {
      throw new Error('Could not find account creation submit button');
    }
  }

  async checkForEmailVerificationRequired() {
    try {
      await expect(this.page.getByText(/check your email/i).first()).toBeVisible({
        timeout: 15000,
      });
      return true;
    } catch {
      return false;
    }
  }

  async verifyEmailVerificationSuccess() {
    // Look for successful verification indicators
    const successIndicators = [
      'text=Email verified',
      'text=Verification successful',
      'text=Email confirmed',
      'text=Account verified',
      '[data-testid="verification-success"]',
      '.verification-success'
    ];
    
    let found = false;
    for (const selector of successIndicators) {
      if (await this.page.locator(selector).count() > 0) {
        await expect(this.page.locator(selector)).toBeVisible({ timeout: 10000 });
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Alternative: check if we're redirected to login or success page
      const currentUrl = this.page.url();
      const isOnSuccessPage = currentUrl.includes('/login') || 
                            currentUrl.includes('/success') || 
                            currentUrl.includes('/verified');
      
      if (!isOnSuccessPage) {
        throw new Error('Could not verify email verification success');
      }
    }
  }

  async loginWithCredentials(email: string, password: string) {
    // Fill login form
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    
    // Submit login
    const loginButtons = [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      'button:has-text("Log In")'
    ];

    let submitted = false;
    for (const selector of loginButtons) {
      const button = this.page.locator(selector);
      if (await button.count() > 0 && await button.isVisible()) {
        await button.click();
        submitted = true;
        break;
      }
    }

    if (!submitted) {
      throw new Error('Could not find login submit button');
    }

    await Promise.race([
      this.page.waitForURL(/\/register/, { timeout: 15000 }),
      this.page.getByText(/please verify your email/i).first().waitFor({ timeout: 15000 }),
      this.page.getByText(/invalid email or password/i).first().waitFor({ timeout: 15000 }),
    ]);
  }

  async fillFamilyRegistrationForm(
    data: HouseholdFormData,
    _authenticatedEmail: string
  ) {
    await fillHouseholdRegistrationForm(this.page, data);
  }

  async submitFamilyRegistration() {
    // Scroll to bottom to ensure submit button is visible
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Look for submit button
    const submitButtons = [
      'button[type="submit"]',
      'button:has-text("Submit Registration")',
      'button:has-text("Submit")',
      'button:has-text("Complete Registration")',
      'button:has-text("Register")'
    ];

    let submitted = false;
    for (const selector of submitButtons) {
      const button = this.page.locator(selector);
      if (await button.count() > 0 && await button.isVisible()) {
        await button.click();
        submitted = true;
        break;
      }
    }

    if (!submitted) {
      throw new Error('Could not find family registration submit button');
    }

    // Wait for submission to process
    await this.page.waitForTimeout(3000);
  }

  async verifyFamilyRegistrationSuccess() {
    // Look for success indicators
    const successIndicators = [
      'text=Registration Complete',
      'text=Successfully Registered',
      'text=Thank you for registering',
      'text=Registration Submitted',
      'text=Thank you',
      '[data-testid="success-message"]',
      '.success-message',
      '[role="alert"]:has-text("success")'
    ];
    
    let found = false;
    for (const selector of successIndicators) {
      if (await this.page.locator(selector).count() > 0) {
        await expect(this.page.locator(selector)).toBeVisible({ timeout: 10000 });
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Alternative: check that we're redirected away from the registration page
      const currentUrl = this.page.url();
      const isOnSuccessPage = currentUrl.includes('/household') || 
                            currentUrl.includes('/dashboard') || 
                            currentUrl.includes('/success') ||
                            !currentUrl.includes('/register');
      
      if (!isOnSuccessPage) {
        throw new Error('Could not verify family registration success');
      }
    }
  }

  async verifyOnParentPortal() {
    // Check that we've reached the parent portal/household page
    const portalIndicators = [
      'h1:has-text("Household")',
      'text=My Children',
      'text=Family Dashboard',
      'text=Parent Portal',
      '[data-testid="household-page"]',
    ];

    let found = false;
    for (const selector of portalIndicators) {
      const loc = this.page.locator(selector).first();
      if (await loc.count() > 0) {
        await expect(loc).toBeVisible({ timeout: 10000 });
        found = true;
        break;
      }
    }

    if (!found) {
      // Check URL patterns
      const currentUrl = this.page.url();
      const isOnPortalPage = currentUrl.includes('/household') || 
                           currentUrl.includes('/dashboard') || 
                           currentUrl.includes('/portal');
      
      if (!isOnPortalPage) {
        throw new Error(`Expected to be on parent portal, but URL is: ${currentUrl}`);
      }
    }

    console.log('Successfully reached parent portal');
  }

  // Error checking methods
  async checkForPasswordValidationError() {
    const errorIndicators = [
      'text=Password must',
      'text=Password should',
      'text=Password Too Short',
      'text=Password is too weak',
      'text=Password requirements',
      '.password-error',
      '[data-testid="password-error"]',
      'input[type="password"] + .error',
      'input[type="password"] ~ .error'
    ];

    for (const selector of errorIndicators) {
      if (await this.page.locator(selector).count() > 0) {
        return true;
      }
    }

    return false;
  }

  async checkForExpiredLinkError() {
    const errorIndicators = [
      'text=expired',
      'text=invalid',
      'text=Link has expired',
      'text=Verification link expired',
      '[role="alert"]:has-text("expired")',
      '.error:has-text("expired")'
    ];

    for (const selector of errorIndicators) {
      if (await this.page.locator(selector).count() > 0) {
        return true;
      }
    }

    return false;
  }

  async checkForUnverifiedEmailError() {
    const errorIndicators = [
      'text=Please verify your email',
      'text=Email not verified',
      'text=Unverified email',
      'text=Check your email',
      '[role="alert"]:has-text("verify")',
      '.error:has-text("verify")'
    ];

    for (const selector of errorIndicators) {
      if (await this.page.locator(selector).count() > 0) {
        return true;
      }
    }

    return false;
  }

  async checkForResendVerificationOption() {
    const resendOptions = [
      'button:has-text("Resend")',
      'button:has-text("Send again")',
      'link:has-text("Resend")',
      '[data-testid="resend-verification"]'
    ];

    for (const selector of resendOptions) {
      if (await this.page.locator(selector).count() > 0) {
        return true;
      }
    }

    return false;
  }

  async clickResendVerification() {
    const resendButton = this.page.locator('button:has-text("Resend"), link:has-text("Resend")').first();
    await resendButton.click();
    await this.page.waitForTimeout(1000);
  }
}