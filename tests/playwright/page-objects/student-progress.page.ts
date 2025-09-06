import { Page, expect } from '@playwright/test';

export class StudentProgressPage {
  constructor(private page: Page) {}

  async switchToStudentsTab() {
    await this.page.click('button:has-text("Students")');
    await this.page.waitForTimeout(2000); // Allow student data to load
  }

  async verifyProgressCards(juniorChildName: string, seniorChildName: string) {
    // Check that both children have progress cards
    await expect(this.page.locator(`text=${juniorChildName}`)).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator(`text=${seniorChildName}`)).toBeVisible({ timeout: 10000 });
    
    console.log(`Verified progress cards exist for ${juniorChildName} and ${seniorChildName}`);
  }

  async clickOnScriptureChild(childName: string) {
    // Click on the child assigned to scripture division
    await this.page.click(`text=${childName}`);
    await this.page.waitForTimeout(1000);
  }

  async verifyScriptureAssignments() {
    // Look for scripture references and status indicators
    const scriptureSelectors = [
      'text=Exodus 20:2-3',
      'text=James 2:17',
      'text=Psalms 19:13-14',
      'text=Primary Minimum',
      'text=assigned',
      'text=not started'
    ];
    
    let scripturesFound = 0;
    for (const selector of scriptureSelectors) {
      if (await this.page.locator(selector).count() > 0) {
        scripturesFound++;
        console.log(`Found scripture reference: ${selector}`);
      }
    }
    
    console.log(`Found ${scripturesFound} scripture-related elements`);
    
    // Expect at least some scripture content to be visible
    expect(scripturesFound).toBeGreaterThan(0);
  }

  async navigateBackToStudentList() {
    // Look for back button or breadcrumb
    const backButton = this.page.locator('button:has-text("Back"), text=Students, text=Bible Bee');
    if (await backButton.count() > 0) {
      await backButton.first().click();
      await this.page.waitForTimeout(1000);
    } else {
      // Alternative: click on Bible Bee tab or navigation
      await this.page.click('text=Bible Bee');
      await this.page.waitForTimeout(1000);
      await this.switchToStudentsTab();
    }
  }

  async clickOnEssayChild(childName: string) {
    // Click on the child assigned to essay division
    await this.page.click(`text=${childName}`);
    await this.page.waitForTimeout(1000);
  }

  async verifyEssayRequirements() {
    // Look for essay-related content
    const essaySelectors = [
      'text=essay',
      'text=Essay',
      'text=submission',
      'text=prompt',
      'text=assignment',
      'text=Senior Division'
    ];
    
    let essayElementsFound = 0;
    for (const selector of essaySelectors) {
      if (await this.page.locator(selector).count() > 0) {
        essayElementsFound++;
        console.log(`Found essay-related element: ${selector}`);
      }
    }
    
    console.log(`Found ${essayElementsFound} essay-related elements`);
    
    // Expect at least some essay content to be visible
    expect(essayElementsFound).toBeGreaterThan(0);
  }

  async takeProgressScreenshot(filename: string) {
    await this.page.screenshot({ 
      path: `test-results/${filename}`, 
      fullPage: true 
    });
    console.log(`Screenshot saved: test-results/${filename}`);
  }
}