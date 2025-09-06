import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login', { waitUntil: 'networkidle' });
  }

  async loginAsAdmin() {
    await this.page.click('button:has-text("admin@example.com")');
    await this.page.click('button:has-text("Sign In")');
    
    // Wait for either dashboard redirect or success notification
    try {
      await this.page.waitForURL('**/dashboard**', { timeout: 8000 });
    } catch {
      // If no redirect, check for success notification and manually navigate
      await expect(this.page.locator('text=Login Successful')).toBeVisible({ timeout: 5000 });
      await this.page.goto('/dashboard');
      await this.page.waitForLoadState('networkidle');
    }
  }

  async loginAsBibleBeeLeader() {
    await this.page.fill('#email', 'leader.biblebee@example.com');
    await this.page.fill('#password', 'password');
    await this.page.click('button:has-text("Sign In")');
    
    // Wait for either dashboard redirect or success notification
    try {
      await this.page.waitForURL('**/dashboard**', { timeout: 8000 });
    } catch {
      // If no redirect, check for success notification and manually navigate
      await expect(this.page.locator('text=Login Successful')).toBeVisible({ timeout: 5000 });
      await this.page.goto('/dashboard');
      await this.page.waitForLoadState('networkidle');
    }
  }

  async loginAsUser(email: string, password: string = 'password') {
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
    await this.page.click('button:has-text("Sign In")');
    
    // Wait for either dashboard redirect or success notification
    try {
      await this.page.waitForURL('**/dashboard**', { timeout: 8000 });
    } catch {
      // If no redirect, check for success notification and manually navigate
      await expect(this.page.locator('text=Login Successful')).toBeVisible({ timeout: 5000 });
      await this.page.goto('/dashboard');
      await this.page.waitForLoadState('networkidle');
    }
  }

  async verifyLoginSuccess() {
    // Look for dashboard navigation elements indicating successful login
    await this.page.waitForSelector('nav, [data-testid="navigation"], text=Dashboard', { 
      timeout: 10000,
      state: 'visible'
    });
  }
}