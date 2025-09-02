import { Page, expect } from '@playwright/test';

export class RegistrationPage {
  constructor(private page: Page) {}

  async navigateToRegistration() {
    await this.page.goto('/register', { waitUntil: 'networkidle' });
  }

  async fillHouseholdInfo(householdName: string, email: string) {
    // Fill household name
    await this.page.fill('input[name="householdName"], input[placeholder*="household name"]', householdName);
    
    // Fill primary guardian information
    await this.page.fill('input[name*="email"], input[type="email"]', email);
    await this.page.fill('input[name*="firstName"], input[placeholder*="first name"]', 'John');
    await this.page.fill('input[name*="lastName"], input[placeholder*="last name"]', 'Smith');
    await this.page.fill('input[name*="phone"], input[placeholder*="phone"]', '555-123-4567');
    
    // Address information
    await this.page.fill('input[name*="street"], input[placeholder*="street"]', '123 Main St');
    await this.page.fill('input[name*="city"], input[placeholder*="city"]', 'Anytown');
    await this.page.fill('input[name*="state"], input[placeholder*="state"]', 'CA');
    await this.page.fill('input[name*="zip"], input[placeholder*="zip"]', '90210');
  }

  async addSecondGuardian() {
    // Look for add guardian button
    const addGuardianButton = this.page.locator('button:has-text("Add Guardian"), button:has-text("Add Parent")');
    if (await addGuardianButton.count() > 0) {
      await addGuardianButton.click();
      
      // Fill second guardian info
      await this.page.fill('input[name*="firstName"]:visible', 'Jane').last();
      await this.page.fill('input[name*="lastName"]:visible', 'Smith').last();
      await this.page.fill('input[name*="email"]:visible', 'jane.smith@example.com').last();
      await this.page.fill('input[name*="phone"]:visible', '555-987-6543').last();
    }
  }

  async addChildForJuniorDivision(firstName: string) {
    await this.addChild(firstName, 'Johnson', '2015-03-15'); // Age ~9 for junior division
  }

  async addChildForSeniorDivision(firstName: string) {
    await this.addChild(firstName, 'Johnson', '2010-08-20'); // Age ~14 for senior division
  }

  private async addChild(firstName: string, lastName: string, birthdate: string) {
    // Look for add child button
    const addChildButton = this.page.locator('button:has-text("Add Child"), button:has-text("Add Another Child")');
    await addChildButton.click();
    
    // Fill child information
    await this.page.fill('input[name*="firstName"]:visible', firstName).last();
    await this.page.fill('input[name*="lastName"]:visible', lastName).last();
    await this.page.fill('input[name*="birth"], input[type="date"]:visible', birthdate).last();
    
    // Select grade based on age
    const age = new Date().getFullYear() - new Date(birthdate).getFullYear();
    const grade = Math.max(1, Math.min(12, age - 5)); // Approximate grade
    
    const gradeSelect = this.page.locator('select[name*="grade"]:visible').last();
    if (await gradeSelect.count() > 0) {
      await gradeSelect.selectOption(grade.toString());
    }
  }

  async selectBibleBeeMinistry() {
    // Look for Bible Bee ministry checkbox
    const bibleBeeCheckbox = this.page.locator('input[type="checkbox"]').filter({ hasText: /bible bee/i });
    if (await bibleBeeCheckbox.count() > 0) {
      await bibleBeeCheckbox.check();
    }
  }

  async submitRegistration() {
    await this.page.click('button:has-text("Submit Registration"), button:has-text("Complete Registration")');
    
    // Wait for confirmation
    await this.page.waitForSelector('text=confirmation, text=success, text=registered', { 
      timeout: 10000,
      state: 'visible'
    });
  }

  async verifyRegistrationSuccess() {
    // Look for success message or confirmation
    const successIndicators = [
      'text=Registration Complete',
      'text=Successfully Registered',
      'text=Thank you for registering',
      'text=confirmation'
    ];
    
    let found = false;
    for (const selector of successIndicators) {
      if (await this.page.locator(selector).count() > 0) {
        await expect(this.page.locator(selector)).toBeVisible();
        found = true;
        break;
      }
    }
    
    if (!found) {
      // If no specific success message, check that we're on a different page or showing household info
      await expect(this.page.url()).not.toContain('/register');
    }
  }
}