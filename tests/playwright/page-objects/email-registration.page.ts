import { Page, expect } from '@playwright/test';

export class EmailRegistrationPage {
  constructor(private page: Page) {}

  async navigateToRegistration() {
    await this.page.goto('/register', { waitUntil: 'networkidle' });
  }

  async enterEmailForVerification(email: string) {
    // Enter email in the household lookup section
    await this.page.fill('input[type="email"]', email);
    await this.page.click('button:has-text("Continue")');
    
    // Wait for response
    await this.page.waitForTimeout(1000);
  }

  async waitForEmailStep() {
    // In a real implementation, this would wait for an email verification step
    // For now, we'll check if we're still on the email entry or if we moved forward
    await this.page.waitForTimeout(2000);
  }

  async fillRegistrationForm(data: {
    householdName: string;
    primaryGuardian: {
      firstName: string;
      lastName: string;
      phone: string;
    };
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    children: Array<{
      firstName: string;
      lastName: string;
      birthdate: string;
    }>;
  }) {
    // Wait for form to be visible
    await expect(this.page.locator('form')).toBeVisible({ timeout: 10000 });

    // Fill household name
    const householdNameInput = this.page.locator('input[name*="name"], #householdName, input[placeholder*="household"], input[placeholder*="family"]').first();
    await householdNameInput.fill(data.householdName);

    // Fill primary guardian information
    await this.page.fill('input[name*="firstName"], input[placeholder*="first name"]', data.primaryGuardian.firstName);
    await this.page.fill('input[name*="lastName"], input[placeholder*="last name"]', data.primaryGuardian.lastName);
    await this.page.fill('input[name*="phone"], input[placeholder*="phone"]', data.primaryGuardian.phone);

    // Fill address
    await this.page.fill('input[name*="address"], input[placeholder*="street"]', data.address.street);
    await this.page.fill('input[name*="city"], input[placeholder*="city"]', data.address.city);
    await this.page.fill('input[name*="state"], input[placeholder*="state"], select[name*="state"]', data.address.state);
    await this.page.fill('input[name*="zip"], input[placeholder*="zip"]', data.address.zip);

    // Add children
    for (let i = 0; i < data.children.length; i++) {
      const child = data.children[i];
      
      // If not the first child, add a new child entry
      if (i > 0) {
        const addChildButton = this.page.locator('button:has-text("Add Child"), button:has-text("Add Another Child")');
        if (await addChildButton.count() > 0) {
          await addChildButton.click();
          await this.page.waitForTimeout(500);
        }
      }

      // Fill child information (target the last/newest set of child fields)
      const childFirstNameInputs = this.page.locator('input[name*="children"], input[placeholder*="child"], input[name*="firstName"]');
      const childLastNameInputs = this.page.locator('input[name*="children"], input[placeholder*="child"], input[name*="lastName"]');
      const childBirthdateInputs = this.page.locator('input[type="date"], input[name*="birth"], input[placeholder*="birth"]');

      if (await childFirstNameInputs.count() > i) {
        await childFirstNameInputs.nth(i).fill(child.firstName);
      }
      if (await childLastNameInputs.count() > i) {
        await childLastNameInputs.nth(i).fill(child.lastName);
      }
      if (await childBirthdateInputs.count() > i) {
        await childBirthdateInputs.nth(i).fill(child.birthdate);
      }
    }
  }

  async submitRegistration() {
    // Look for various submit button patterns
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

    // Wait for submission to process
    await this.page.waitForTimeout(2000);
  }

  async verifyRegistrationSuccess() {
    // Look for success indicators
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
      // Alternative: check that we're redirected away from the registration page
      // or that we're now on a household/dashboard page
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
    // Check that we've reached the parent portal/household page
    const portalIndicators = [
      'text=Household',
      'text=My Children',
      'text=Family Dashboard',
      'text=Parent Portal',
      '[data-testid="household-page"]',
      'h1:has-text("Dashboard")',
      'nav:has-text("Household")'
    ];

    let found = false;
    for (const selector of portalIndicators) {
      if (await this.page.locator(selector).count() > 0) {
        await expect(this.page.locator(selector)).toBeVisible({ timeout: 10000 });
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

  async checkForEmailVerificationStep() {
    // Check if we're on an email verification step
    const verificationIndicators = [
      'text=Check your email',
      'text=Verification email sent',
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