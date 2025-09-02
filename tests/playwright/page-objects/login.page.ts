import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login', { waitUntil: 'networkidle' });
  }

  async loginAsAdmin() {
    await this.page.click('button:has-text("admin@example.com")');
    await this.page.click('button:has-text("Sign In")');
    await this.page.waitForURL('**/dashboard**', { timeout: 10000 });
  }

  async loginAsUser(email: string, password: string = 'password') {
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
    await this.page.click('button:has-text("Sign In")');
    await this.page.waitForURL('**/dashboard**', { timeout: 10000 });
  }

  async verifyLoginSuccess() {
    // Look for navigation sidebar elements indicating successful login
    await expect(this.page.locator('nav')).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator('text=Dashboard')).toBeVisible();
  }
}