import { Page, expect } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async fillFormField(selector: string, value: string) {
    const field = this.page.locator(selector);
    await field.waitFor({ state: 'visible' });
    await field.fill(value);
  }

  async fillFormFieldWithFallback(selectors: string[], value: string) {
    for (const selector of selectors) {
      const field = this.page.locator(selector);
      if (await field.count() > 0) {
        try {
          await field.waitFor({ state: 'visible', timeout: 2000 });
          await field.fill(value);
          console.log(`✅ Filled field using selector: ${selector}`);
          return;
        } catch (error) {
          console.log(`⚠️ Failed to fill field with selector: ${selector}`);
          continue;
        }
      }
    }
    console.log(`❌ Could not fill field with any selector for value: ${value}`);
  }

  async selectFromDropdown(selector: string, value: string) {
    const dropdown = this.page.locator(selector);
    await dropdown.click();
    await this.page.locator(`[role="option"]:has-text("${value}")`).click();
  }

  async checkboxCheck(selector: string) {
    const checkbox = this.page.locator(selector);
    await checkbox.waitFor({ state: 'visible' });
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await checkbox.click();
    }
  }

  async scrollToBottom() {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  async logCurrentPage() {
    const url = this.page.url();
    const title = await this.page.title();
    console.log(`Current page: ${title} (${url})`);
  }
}