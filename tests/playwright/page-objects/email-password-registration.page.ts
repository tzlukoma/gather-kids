import { Page, expect } from '@playwright/test';

export class EmailPasswordRegistrationPage {
  constructor(private page: Page) {}

  async navigateToCreateAccount() {
    await this.page.goto('/create-account', { waitUntil: 'networkidle' });
  }

  async navigateToLogin() {
    await this.page.goto('/login', { waitUntil: 'networkidle' });
  }

  async navigateToFamilyRegistration() {
    await this.page.goto('/register', { waitUntil: 'networkidle' });
  }

  async fillAccountCreationForm(email: string, password: string) {
    // Fill email field
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

    // Wait for submission to process
    await this.page.waitForTimeout(2000);
  }

  async checkForEmailVerificationRequired() {
    // Check if we're on an email verification required page
    const verificationIndicators = [
      'text=Check your email',
      'text=Verify your email',
      'text=Email verification required',
      'text=Verification email sent',
      'text=Please verify your email',
      '[data-testid="email-verification-required"]'
    ];

    await this.page.waitForTimeout(1000); // Give time for any redirects

    for (const selector of verificationIndicators) {
      if (await this.page.locator(selector).count() > 0) {
        return true;
      }
    }

    return false;
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

    // Wait for login to process
    await this.page.waitForTimeout(3000);
  }

  async fillFamilyRegistrationForm(data: {
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
  }, authenticatedEmail: string) {
    // Since user is authenticated, we might skip the email lookup step
    // Check if we're already on the form or need to skip email entry
    const isOnForm = await this.page.locator('input[name*="address"], input[placeholder*="street"]').count() > 0;
    
    if (!isOnForm) {
      // We might be on the email lookup step - the email should be pre-filled or we should skip it
      const emailInput = this.page.locator('input[type="email"]');
      if (await emailInput.count() > 0) {
        const currentValue = await emailInput.inputValue();
        if (!currentValue) {
          await emailInput.fill(authenticatedEmail);
        }
        
        // Click continue to proceed
        const continueButton = this.page.locator('button:has-text("Continue")');
        if (await continueButton.count() > 0) {
          await continueButton.click();
          await this.page.waitForTimeout(2000);
        }
      }
    }

    // Wait for form to be visible
    await expect(this.page.locator('form')).toBeVisible({ timeout: 10000 });

    // Fill address (this is usually the first required field)
    await this.page.fill('input[name*="address"], input[placeholder*="street"]', data.address.street);

    // Fill household name if visible
    const householdNameInput = this.page.locator('input[name*="household"], input[placeholder*="household"]');
    if (await householdNameInput.count() > 0) {
      await householdNameInput.fill(data.householdName);
    }

    // Fill primary guardian information
    const firstNameInputs = this.page.locator('input[name*="first_name"], input[placeholder*="first"]');
    const lastNameInputs = this.page.locator('input[name*="last_name"], input[placeholder*="last"]');
    const phoneInputs = this.page.locator('input[type="tel"], input[name*="phone"], input[placeholder*="phone"]');

    if (await firstNameInputs.count() > 0) {
      await firstNameInputs.first().fill(data.primaryGuardian.firstName);
    }
    if (await lastNameInputs.count() > 0) {
      await lastNameInputs.first().fill(data.primaryGuardian.lastName);
    }
    if (await phoneInputs.count() > 0) {
      await phoneInputs.first().fill(data.primaryGuardian.phone);
    }

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

      // Fill child information in accordion or expanded sections
      const childSections = this.page.locator('[data-state="open"], .accordion-content:visible, .child-section');
      if (await childSections.count() > i) {
        const section = childSections.nth(i);
        
        // Fill child details within this section
        await section.locator('input[name*="first_name"], input[placeholder*="first"]').fill(child.firstName);
        await section.locator('input[name*="last_name"], input[placeholder*="last"]').fill(child.lastName);
        await section.locator('input[type="date"], input[name*="dob"], input[name*="birth"]').fill(child.birthdate);
        
        // Fill required grade field if present
        const gradeInput = section.locator('input[name*="grade"], select[name*="grade"]');
        if (await gradeInput.count() > 0) {
          await gradeInput.fill('K'); // Default grade
        }
      }
    }

    // Fill emergency contact if required
    const emergencyFirstName = this.page.locator('input[name*="emergency"][name*="first"], input[name*="emergencyContact"][name*="first"]');
    if (await emergencyFirstName.count() > 0) {
      await emergencyFirstName.fill('Emergency');
      
      const emergencyLastName = this.page.locator('input[name*="emergency"][name*="last"], input[name*="emergencyContact"][name*="last"]');
      if (await emergencyLastName.count() > 0) {
        await emergencyLastName.fill('Contact');
      }
      
      const emergencyPhone = this.page.locator('input[name*="emergency"][name*="phone"], input[name*="emergencyContact"][name*="phone"]');
      if (await emergencyPhone.count() > 0) {
        await emergencyPhone.fill('555-999-0000');
      }
      
      const emergencyRelation = this.page.locator('input[name*="emergency"][name*="relation"], input[name*="emergencyContact"][name*="relation"]');
      if (await emergencyRelation.count() > 0) {
        await emergencyRelation.fill('Aunt');
      }
    }

    // Accept required consents
    const consentCheckboxes = this.page.locator('input[type="checkbox"][required], input[name*="consent"], input[name*="liability"], input[name*="photo"]');
    const consentCount = await consentCheckboxes.count();
    for (let i = 0; i < consentCount; i++) {
      const checkbox = consentCheckboxes.nth(i);
      const isChecked = await checkbox.isChecked();
      if (!isChecked) {
        await checkbox.click();
      }
    }
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

  // Error checking methods
  async checkForPasswordValidationError() {
    const errorIndicators = [
      'text=Password must',
      'text=Password should',
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