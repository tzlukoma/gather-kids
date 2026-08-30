import { Page, expect } from '@playwright/test';
import {
  fillHouseholdRegistrationForm,
  type HouseholdFormData,
} from '../utils/fill-household-form';

export class EmailRegistrationPage {
  constructor(private page: Page) {}

  async navigateToRegistration() {
    await this.page.goto('/register', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByText('Household Lookup')).toBeVisible({
      timeout: 30000,
    });
  }

  async enterEmailForVerification(email: string) {
    const emailInput = this.page.locator(
      'input[type="email"], input[placeholder*="email" i]'
    ).first();
    await expect(emailInput).toBeVisible({ timeout: 30000 });
    await emailInput.fill(email);

    const continueButton = this.page.locator('button:has-text("Continue")').first();
    await expect(continueButton).toBeVisible();
    await continueButton.click();

    await this.page.waitForTimeout(1000);
  }

  async waitForEmailStep() {
    await this.page.waitForTimeout(2000);
  }

  async fillRegistrationForm(data: HouseholdFormData) {
    await fillHouseholdRegistrationForm(this.page, data);
  }

  async submitRegistration() {
    const submitButtons = [
      'button[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Register")',
      'button:has-text("Complete")',
      'button:has-text("Finish")'
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
      throw new Error('Could not find submit button for registration form');
    }

    await this.page.waitForTimeout(2000);
  }

  async verifyRegistrationSuccess() {
    const successIndicators = [
      'text=Registration Complete',
      'text=Successfully Registered',
      'text=Thank you for registering',
      'text=Registration Submitted',
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
      const currentUrl = this.page.url();
      const isOnSuccessPage = currentUrl.includes('/household') || 
                            currentUrl.includes('/dashboard') || 
                            currentUrl.includes('/success') ||
                            !currentUrl.includes('/register');
      
      if (isOnSuccessPage) {
        console.log('Registration appears successful - redirected to:', currentUrl);
      } else {
        throw new Error('Could not verify registration success');
      }
    }
  }

  async verifyOnParentPortal() {
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

  async checkForEmailVerificationStep() {
    const verificationIndicators = [
      'text=Check your email',
      'text=Check Your Email',
      'text=Verification email sent',
      'text=Verification Email Sent',
      'text=Magic link',
      'text=Click the link in your email',
      '[data-testid="email-verification"]'
    ];

    for (const selector of verificationIndicators) {
      if (await this.page.locator(selector).count() > 0) {
        return true;
      }
    }

    return false;
  }
}
