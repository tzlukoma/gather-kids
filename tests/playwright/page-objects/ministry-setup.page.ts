import { Page, expect } from '@playwright/test';

export class MinistrySetupPage {
  constructor(private page: Page) {}

  async navigateToMinistries() {
    await this.page.click('text=Ministries');
    await this.page.waitForSelector('h1:has-text("Ministry Management")', { timeout: 10000 });
  }

  async ensureBibleBeeMinistryExists() {
    // Check if Bible Bee ministry already exists
    const bibleBeeMinistry = this.page.locator('text=Bible Bee').first();
    
    if (await bibleBeeMinistry.count() === 0) {
      // Create Bible Bee ministry if it doesn't exist
      await this.page.click('button:has-text("Add Ministry")');
      await this.page.fill('#name', 'Bible Bee');
      await this.page.fill('#description', 'Scripture memorization and essay competition ministry for children and youth');
      await this.page.check('#isActive');
      await this.page.selectOption('#enrollmentType', 'ENROLLED');
      await this.page.click('button:has-text("Create Ministry")');
      
      // Wait for ministry to be created
      await expect(this.page.locator('text=Bible Bee')).toBeVisible({ timeout: 5000 });
    }
  }

  async verifyMinistryActive() {
    await expect(this.page.locator('text=Bible Bee')).toBeVisible();
    // Could add more specific checks for active status if needed
  }
}