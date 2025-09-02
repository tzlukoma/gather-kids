import { Page, expect } from '@playwright/test';
import path from 'path';

export class BibleBeeConfigPage {
  constructor(private page: Page) {}

  async navigateToBibleBee() {
    await this.page.click('text=Bible Bee');
    await this.page.waitForSelector('h1:has-text("Bible Bee")', { timeout: 10000 });
  }

  async switchToManageTab() {
    await this.page.click('button:has-text("Manage")');
    await this.page.waitForTimeout(1000); // Allow tab content to load
  }

  async createCompetitionYear(yearLabel: string) {
    await this.page.click('button:has-text("Add Year")');
    await this.page.fill('#year-label', yearLabel);
    await this.page.check('#is-active');
    await this.page.click('button:has-text("Create")');
    
    // Wait for the year to be created and selected
    await this.page.waitForTimeout(1000);
  }

  async uploadCsvScriptures(csvFilePath: string) {
    // Look for CSV upload section
    const csvUpload = this.page.locator('input[type="file"]').first();
    await csvUpload.setInputFiles(csvFilePath);
    
    // Wait for preview to load
    await this.page.waitForTimeout(2000);
    
    // Click commit/import button
    const commitButton = this.page.locator('button:has-text("Import"), button:has-text("Commit")').first();
    if (await commitButton.count() > 0) {
      await commitButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async uploadJsonScriptures(jsonFilePath: string) {
    // Look for JSON upload section - might be a different file input
    const jsonUpload = this.page.locator('input[type="file"]').nth(1);
    if (await jsonUpload.count() > 0) {
      await jsonUpload.setInputFiles(jsonFilePath);
      
      // Wait for preview to load
      await this.page.waitForTimeout(2000);
      
      // Click commit/import button for JSON
      const commitButton = this.page.locator('button:has-text("Import"), button:has-text("Commit")').last();
      if (await commitButton.count() > 0) {
        await commitButton.click();
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async createDivisions() {
    // Create Junior Division for scripture memorization
    await this.createDivision('Junior Division', 'scripture', 5, 6, 10);
    
    // Create Senior Division for essay
    await this.createDivision('Senior Division', 'essay', 11, 18, 1);
  }

  private async createDivision(name: string, type: 'scripture' | 'essay', minAge: number, maxAge: number, target: number) {
    // Look for division creation UI - this might vary based on implementation
    const addDivisionButton = this.page.locator('button:has-text("Add Division")');
    if (await addDivisionButton.count() > 0) {
      await addDivisionButton.click();
      
      await this.page.fill('input[placeholder*="division name"], input[name*="name"]', name);
      await this.page.selectOption('select[name*="type"]', type);
      await this.page.fill('input[name*="minAge"], input[placeholder*="min age"]', minAge.toString());
      await this.page.fill('input[name*="maxAge"], input[placeholder*="max age"]', maxAge.toString());
      await this.page.fill('input[name*="target"], input[placeholder*="target"]', target.toString());
      
      await this.page.click('button:has-text("Create Division"), button:has-text("Save")');
      await this.page.waitForTimeout(1000);
    }
  }

  async verifyScripturesImported() {
    // Check that scriptures were successfully imported
    const scriptureCount = await this.page.locator('text=/\\d+ scripture/i').first();
    await expect(scriptureCount).toBeVisible({ timeout: 5000 });
  }

  async verifyDivisionsCreated() {
    await expect(this.page.locator('text=Junior Division')).toBeVisible();
    await expect(this.page.locator('text=Senior Division')).toBeVisible();
  }
}