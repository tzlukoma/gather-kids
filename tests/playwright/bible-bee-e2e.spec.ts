import { test, expect } from '@playwright/test';
import path from 'path';
import { LoginPage } from './page-objects/login.page';
import { MinistrySetupPage } from './page-objects/ministry-setup.page';
import { BibleBeeConfigPage } from './page-objects/bible-bee-config.page';
import { RegistrationPage } from './page-objects/registration.page';
import { BibleBeeEnrollmentPage } from './page-objects/bible-bee-enrollment.page';
import { StudentProgressPage } from './page-objects/student-progress.page';

test.describe('Bible Bee End-to-End Flow', () => {
  test('Complete Bible Bee ministry flow from setup to student progress tracking', async ({ page }) => {
    // Test data
    const competitionYear = `E2E Test ${Date.now()}`;
    const householdName = `E2E Test Family ${Date.now()}`;
    const householdEmail = `e2e.test.${Date.now()}@example.com`;
    const juniorChildName = 'Emma';
    const seniorChildName = 'Daniel';
    
    // Fixture file paths
    const csvFixturePath = path.join(__dirname, 'fixtures', 'bible-bee-scriptures.csv');
    const jsonFixturePath = path.join(__dirname, 'fixtures', 'bible-bee-scriptures.json');

    // Initialize page objects
    const loginPage = new LoginPage(page);
    const ministrySetupPage = new MinistrySetupPage(page);
    const bibleBeeConfigPage = new BibleBeeConfigPage(page);
    const registrationPage = new RegistrationPage(page);
    const enrollmentPage = new BibleBeeEnrollmentPage(page);
    const progressPage = new StudentProgressPage(page);

    // Set up console and error logging
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(`[console:${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      logs.push(`[pageerror] ${err.message}`);
    });

    try {
      // ========== STEP 1: Admin Login and Ministry Setup ==========
      console.log('🔐 Step 1: Admin Login and Ministry Setup');
      
      await loginPage.goto();
      await loginPage.loginAsAdmin();
      await loginPage.verifyLoginSuccess();
      
      await ministrySetupPage.navigateToMinistries();
      await ministrySetupPage.ensureBibleBeeMinistryExists();
      await ministrySetupPage.verifyMinistryActive();

      // Take screenshot after ministry setup
      await page.screenshot({ 
        path: 'test-results/01-ministry-setup.png', 
        fullPage: true 
      });

      // ========== STEP 2: Bible Bee Configuration ==========
      console.log('⚙️ Step 2: Bible Bee Configuration');
      
      await bibleBeeConfigPage.navigateToBibleBee();
      await bibleBeeConfigPage.switchToManageTab();
      await bibleBeeConfigPage.createCompetitionYear(competitionYear);

      // Take screenshot after year creation
      await page.screenshot({ 
        path: 'test-results/02-competition-year.png', 
        fullPage: true 
      });

      // ========== STEP 3: Scripture Data Setup ==========
      console.log('📖 Step 3: Scripture Data Upload and Import');
      
      await bibleBeeConfigPage.uploadCsvScriptures(csvFixturePath);
      await bibleBeeConfigPage.uploadJsonScriptures(jsonFixturePath);
      await bibleBeeConfigPage.verifyScripturesImported();

      // Create divisions for different age groups
      await bibleBeeConfigPage.createDivisions();
      await bibleBeeConfigPage.verifyDivisionsCreated();

      // Take screenshot after scripture setup
      await page.screenshot({ 
        path: 'test-results/03-scripture-setup.png', 
        fullPage: true 
      });

      // ========== STEP 4: Family Registration ==========
      console.log('👨‍👩‍👧‍👦 Step 4: Family Registration');
      
      await registrationPage.navigateToRegistration();
      await registrationPage.fillHouseholdInfo(householdName, householdEmail);
      await registrationPage.addSecondGuardian();
      
      // Add children for different divisions
      await registrationPage.addChildForJuniorDivision(juniorChildName);
      await registrationPage.addChildForSeniorDivision(seniorChildName);
      
      await registrationPage.selectBibleBeeMinistry();
      await registrationPage.submitRegistration();
      await registrationPage.verifyRegistrationSuccess();

      // Take screenshot after registration
      await page.screenshot({ 
        path: 'test-results/04-family-registration.png', 
        fullPage: true 
      });

      // ========== STEP 5: Back to Admin - Auto-Enrollment Preview ==========
      console.log('👁️ Step 5: Auto-Enrollment Preview');
      
      // Login back as admin to manage enrollments
      await loginPage.goto();
      await loginPage.loginAsAdmin();
      
      await enrollmentPage.navigateToBibleBee();
      await enrollmentPage.switchToEnrollmentTab();
      await enrollmentPage.verifyChildrenInPreview(juniorChildName, seniorChildName);

      // Take screenshot of enrollment preview
      await page.screenshot({ 
        path: 'test-results/05-enrollment-preview.png', 
        fullPage: true 
      });

      // ========== STEP 6: Student Enrollment ==========
      console.log('✅ Step 6: Student Enrollment Completion');
      
      await enrollmentPage.completeEnrollment();
      await enrollmentPage.verifyEnrollmentSuccess();

      // Take screenshot after enrollment
      await page.screenshot({ 
        path: 'test-results/06-enrollment-complete.png', 
        fullPage: true 
      });

      // ========== STEP 7: Progress Tracking ==========
      console.log('📊 Step 7: Progress Tracking Verification');
      
      await progressPage.switchToStudentsTab();
      await progressPage.verifyProgressCards(juniorChildName, seniorChildName);

      // Check scripture child progress
      await progressPage.clickOnScriptureChild(juniorChildName);
      await progressPage.verifyScriptureAssignments();
      await progressPage.takeProgressScreenshot('07a-scripture-progress.png');

      // Navigate back and check essay child
      await progressPage.navigateBackToStudentList();
      await progressPage.clickOnEssayChild(seniorChildName);
      await progressPage.verifyEssayRequirements();
      await progressPage.takeProgressScreenshot('07b-essay-progress.png');

      // Final screenshot
      await page.screenshot({ 
        path: 'test-results/08-final-state.png', 
        fullPage: true 
      });

      console.log('✅ Bible Bee end-to-end test completed successfully!');

    } catch (error) {
      console.error('❌ Test failed with error:', error);
      
      // Dump console logs on error
      console.log('--- Browser console logs ---');
      logs.forEach(log => console.log(log));
      console.log('--- End logs ---');
      
      // Take error screenshot
      await page.screenshot({ 
        path: 'test-results/error-screenshot.png', 
        fullPage: true 
      });
      
      throw error;
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up any test data if needed
    console.log('Test cleanup completed');
  });
});