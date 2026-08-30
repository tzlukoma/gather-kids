import { Page, expect } from '@playwright/test';

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
    await expect(this.page.locator('form')).toBeVisible({ timeout: 10000 });

    const householdNameInput = this.page.locator('input[name="household.name"]');
    if (await householdNameInput.count() > 0) {
      await householdNameInput.fill(data.householdName);
    }

    await this.page.fill('input[name="guardians.0.first_name"]', data.primaryGuardian.firstName);
    await this.page.fill('input[name="guardians.0.last_name"]', data.primaryGuardian.lastName);
    await this.page.fill('input[name="guardians.0.mobile_phone"]', data.primaryGuardian.phone);

    await this.page.fill('input[name="household.address_line1"]', data.address.street);
    await this.page.fill('input[name="household.city"]', data.address.city);
    await this.page.fill('input[name="household.state"]', data.address.state);
    await this.page.fill('input[name="household.zip"]', data.address.zip);

    for (let i = 0; i < data.children.length; i++) {
      const child = data.children[i];
      
      if (i > 0) {
        const addChildButton = this.page.locator('button:has-text("Add Child"), button:has-text("Add Another Child")');
        if (await addChildButton.count() > 0) {
          await addChildButton.click();
          await this.page.waitForTimeout(500);
        }
      }

      await this.page.fill(`input[name="children.${i}.first_name"]`, child.firstName);
      await this.page.fill(`input[name="children.${i}.last_name"]`, child.lastName);
      await this.page.fill(`input[name="children.${i}.dob"]`, child.birthdate);
    }
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
