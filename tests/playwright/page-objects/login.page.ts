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
    
    // Wait for either dashboard redirect or success notification (toast title or description)
    try {
      await this.page.waitForURL('**/dashboard**', { timeout: 10000 });
    } catch {
      // If no redirect, check for success notification and manually navigate
      await expect(
        this.page.getByText(/Login Successful|Welcome,/i)
      ).toBeVisible({ timeout: 8000 });
      await this.page.goto('/dashboard');
      await this.page.waitForLoadState('networkidle');
    }
  }

  async verifyLoginSuccess() {
    // Look for dashboard nav or heading indicating we're on dashboard
    await expect(
      this.page.locator('nav').or(this.page.getByRole('link', { name: 'Dashboard' })).or(this.page.getByRole('heading', { name: /dashboard|user management|ministry/i }))
    ).toBeVisible({ timeout: 10000 });
  }
}