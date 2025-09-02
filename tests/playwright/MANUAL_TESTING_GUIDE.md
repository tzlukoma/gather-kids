# Bible Bee End-to-End Test Manual Validation Guide

This document provides step-by-step instructions for manually validating the Bible Bee ministry flow when automated testing encounters authentication issues.

## Prerequisites

1. Start the development server: `npm run dev`
2. Navigate to: http://localhost:9002
3. Ensure the application is running in demo mode

## Test Scenario: Complete Bible Bee Ministry Flow

### Step 1: Admin Login and Ministry Setup

1. **Navigate to Login**
   - Go to http://localhost:9002/login
   - Verify demo mode is active and demo accounts are listed

2. **Login as Admin**
   - Click the "admin@example.com" button to auto-fill credentials
   - Click "Sign In"
   - Verify "Login Successful - Welcome, Admin User!" notification appears
   - If redirected back to login, manually navigate to http://localhost:9002/dashboard

3. **Verify Dashboard Access**
   - Confirm you can see the dashboard with navigation sidebar
   - Look for links to: Dashboard, Check-In/Out, Rosters, Incidents, etc.

4. **Access Ministry Management**
   - Click "Ministries" in the navigation
   - Verify you reach the Ministry Management page
   - Confirm "Bible Bee" ministry exists and is active
   - If not, create new ministry:
     - Click "Add Ministry"
     - Name: "Bible Bee"
     - Description: "Scripture memorization and essay competition ministry"
     - Type: "ENROLLED"
     - Set as Active
     - Save

**Screenshot Checkpoint**: Take screenshot of Ministry Management page showing Bible Bee ministry

### Step 2: Bible Bee Configuration

1. **Access Bible Bee Management**
   - Click "Bible Bee" in the navigation sidebar
   - Verify you reach the Bible Bee management page with tabs

2. **Switch to Manage Tab**
   - Click the "Manage" tab
   - Verify you see competition year management interface

3. **Create Competition Year**
   - Click "Add Year" button
   - Enter label: "E2E Test 2025"
   - Check "Active" checkbox
   - Click "Create"
   - Verify new year appears and is selected

**Screenshot Checkpoint**: Take screenshot of Bible Bee Manage tab with new competition year

### Step 3: Scripture Data Setup

1. **Prepare Test Files**
   - Use the provided CSV file: `tests/playwright/fixtures/bible-bee-scriptures.csv`
   - Use the provided JSON file: `tests/playwright/fixtures/bible-bee-scriptures.json`

2. **Import CSV Scriptures**
   - Look for CSV upload section in the Manage tab
   - Upload the CSV file
   - Verify preview shows scripture entries
   - Click "Import" or "Commit" to save
   - Verify success message

3. **Import JSON Scriptures**
   - Look for JSON upload section
   - Upload the JSON file
   - Verify preview shows additional scriptures with translations
   - Click "Import" or "Commit" to save
   - Verify scriptures are added to the database

4. **Create Divisions**
   - Look for division management interface
   - Create "Junior Division":
     - Name: Junior Division
     - Type: Scripture memorization
     - Age range: 6-10 years
     - Target count: 5 scriptures
   - Create "Senior Division":
     - Name: Senior Division
     - Type: Essay
     - Age range: 11-18 years
     - Target count: 1 essay

**Screenshot Checkpoint**: Take screenshot showing scripture import results and divisions

### Step 4: Family Registration

1. **Navigate to Registration**
   - Go to http://localhost:9002/register
   - Verify registration form loads

2. **Fill Household Information**
   - Household Name: "E2E Test Family"
   - Primary Guardian:
     - First Name: John
     - Last Name: Smith
     - Email: e2e.test@example.com
     - Phone: 555-123-4567
   - Address:
     - Street: 123 Test St
     - City: Testville
     - State: CA
     - ZIP: 90210

3. **Add Second Guardian**
   - Click "Add Guardian" if available
   - First Name: Jane
   - Last Name: Smith
   - Email: jane.smith@example.com
   - Phone: 555-987-6543

4. **Add Children for Different Divisions**
   - **Junior Division Child**:
     - First Name: Emma
     - Last Name: Johnson
     - Birthdate: 2015-03-15 (age ~9)
     - Grade: 3rd
   - **Senior Division Child**:
     - First Name: Daniel
     - Last Name: Johnson
     - Birthdate: 2010-08-20 (age ~14)
     - Grade: 8th

5. **Select Bible Bee Ministry**
   - Find Bible Bee ministry in enrollment options
   - Check the box to enroll children

6. **Submit Registration**
   - Click "Submit Registration" or "Complete Registration"
   - Verify confirmation message appears
   - Note any confirmation number or success indicators

**Screenshot Checkpoint**: Take screenshot of registration confirmation

### Step 5: Auto-Enrollment Preview

1. **Return to Admin Dashboard**
   - Navigate back to http://localhost:9002/login
   - Login as admin again if needed
   - Go to Bible Bee management

2. **Access Enrollment Tab**
   - Click "Enrollment" tab in Bible Bee management
   - Wait for auto-enrollment preview to load

3. **Verify Children in Preview**
   - Confirm Emma Johnson appears in preview
   - Confirm Daniel Johnson appears in preview
   - Verify age-based division assignments:
     - Emma should be assigned to Junior Division (scripture)
     - Daniel should be assigned to Senior Division (essay)

**Screenshot Checkpoint**: Take screenshot of enrollment preview showing both children

### Step 6: Student Enrollment

1. **Complete Enrollment Process**
   - Look for "Enroll" buttons in the preview
   - Click to enroll each child or use bulk enrollment
   - Verify success messages appear

2. **Verify Enrollment Completion**
   - Check that children are no longer in "pending" status
   - Look for enrolled status indicators

**Screenshot Checkpoint**: Take screenshot of completed enrollments

### Step 7: Progress Tracking

1. **Access Students Tab**
   - Click "Students" tab in Bible Bee management
   - Verify both children appear with progress cards

2. **Verify Emma's Scripture Progress**
   - Click on Emma Johnson's progress card
   - Verify scripture list shows assigned verses
   - Check that scriptures show "assigned" or "not started" status
   - Look for scripture references like:
     - Exodus 20:2-3
     - James 2:17
     - Psalms 19:13-14
   - Verify target count matches Junior Division requirements

3. **Verify Daniel's Essay Progress**
   - Navigate back to student list
   - Click on Daniel Johnson's progress card
   - Verify essay requirements are displayed
   - Check for essay prompt or submission interface
   - Verify assignment matches Senior Division requirements

**Screenshot Checkpoint**: Take screenshots of both children's progress pages

## Expected Results Summary

✅ **Admin Login**: Successful authentication and dashboard access  
✅ **Ministry Setup**: Bible Bee ministry active and configured  
✅ **Bible Bee Configuration**: Competition year created with divisions  
✅ **Scripture Import**: CSV and JSON data successfully imported  
✅ **Family Registration**: Household with two children registered  
✅ **Auto-Enrollment**: Children correctly matched to appropriate divisions  
✅ **Student Enrollment**: Both children successfully enrolled  
✅ **Progress Tracking**: Individual progress cards show correct assignments  

## Troubleshooting

### Authentication Issues
- If login redirects back to login page, manually navigate to dashboard URLs
- Clear browser storage and retry login
- Verify demo mode is active

### Data Import Issues
- Check file format matches expected CSV/JSON structure
- Verify competition year is selected before import
- Look for validation error messages

### Enrollment Issues
- Verify children's ages fall within division age ranges
- Check that Bible Bee ministry was selected during registration
- Confirm competition year is active

## File References

- **CSV Test Data**: `tests/playwright/fixtures/bible-bee-scriptures.csv`
- **JSON Test Data**: `tests/playwright/fixtures/bible-bee-scriptures.json`
- **Page Objects**: `tests/playwright/page-objects/`
- **Main Test**: `tests/playwright/bible-bee-e2e.spec.ts`

## Notes for Future Automation

1. Authentication timing issue needs investigation
2. Page object selectors may need refinement based on actual UI elements
3. Consider adding data-testid attributes for more reliable element selection
4. File upload functionality may require special handling in Playwright
5. Division creation interface may vary from assumptions in page objects

This manual validation ensures the complete Bible Bee flow works as intended while the automated test framework is refined.