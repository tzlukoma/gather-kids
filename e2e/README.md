# E2E Test Suite: Email/Password Registration Flow

This directory contains comprehensive end-to-end tests for the complete email/password registration flow in gatherKids, from account creation through household data verification.

## Overview

The test suite validates the following complete flow:
1. **Account Creation** - Email/password signup with validation
2. **Email Verification** - MailHog-based email confirmation 
3. **Registration Form** - Complete family data entry with 2 guardians, 1 emergency contact, 2 children
4. **Ministry Selection** - Each child selects ≥2 ministries from seeded list
5. **Consent Handling** - Terms, media, and safety consent acceptance
6. **Data Persistence** - Verification on household page

## Directory Structure

```
e2e/
├── auth-registration.spec.ts     # Main test file
├── utils/
│   ├── seed.ts                  # Database seeding utilities
│   ├── mailhog.ts              # MailHog API integration
│   ├── data.ts                 # Test data generators
│   ├── helpers.ts              # Common test helpers
│   └── global-setup.ts         # Global test setup
├── fixtures/
│   └── test-data.json          # Static test data
└── README.md                   # This file
```

## Environment Configuration

### Environment Files

Copy the example environment files and configure with your actual values:

```bash
# Local development
cp .env.e2e.local.example .env.e2e.local

# CI/UAT environment  
cp .env.e2e.ci.example .env.e2e.ci
```

### Configuration Variables

**BASE_URL**: Application under test
- Local: `http://localhost:9002`
- UAT: `https://uat.gatherkidslive.com`

**SUPABASE_URL**: Database connection
- Local: `http://localhost:54321` (via `supabase start`)
- UAT: Your Supabase project URL

**SUPABASE_SERVICE_ROLE**: Database admin access
- Required for seeding test ministries
- Get from Supabase dashboard → Settings → API

**MAILHOG_API**: Email testing service
- Local: `http://localhost:8025/api/v2`
- CI: `http://mailhog:8025/api/v2`

## Prerequisites

### Local Development

1. **Next.js Application**
   ```bash
   npm run dev  # Starts on port 9002
   ```

2. **Supabase Local Stack**
   ```bash
   supabase start  # Starts local database
   ```

3. **MailHog Service**
   ```bash
   docker run --rm -p 1025:1025 -p 8025:8025 mailhog/mailhog
   ```

4. **Environment Configuration**
   ```bash
   cp .env.e2e.local.example .env.e2e.local
   # Edit .env.e2e.local with your actual values
   ```

### CI/UAT Environment

1. **UAT Database**: Must have Supabase project configured
2. **MailHog Service**: Containerized alongside test runner
3. **Environment Variables**: Set in CI system or UAT environment

## Running Tests

### Available Scripts

```bash
# Local development (headless)
npm run test:e2e:local

# Local development (headed - see browser)
npm run test:e2e:headed

# CI/UAT environment
npm run test:e2e:ci

# Debug mode (local)
npm run test:e2e:debug
```

### Test Execution

The tests run **sequentially** (not parallel) to ensure:
- Email verification isolation
- Database seeding consistency
- Proper cleanup between tests

Timeout is set to **60 seconds** to account for email delivery delays.

## Test Data

### Automatic Database Seeding

Before tests run, the system automatically seeds:
- **5 test ministries** (Sunday School, Children's Choir, Kids Club, Bible Bee, Youth Group)
- **Idempotent operations** - safe to run multiple times

### Generated Test Data

Each test run generates unique:
- **Email addresses** - `testuser.{timestamp}.{random}@example.test`
- **Guardian information** - Primary and secondary guardians
- **Emergency contact** - Aunt relationship with phone
- **Children data** - 2 children with birthdates and grades

## Test Scenarios

### Main Flow Test: `complete registration flow with email confirmation`

Validates the complete happy path:
1. Navigate to signup page
2. Create account with email/password
3. Retrieve verification email via MailHog
4. Follow confirmation link
5. Fill registration form with all required data
6. Select ministries for each child (≥2 per child)
7. Accept all consent forms
8. Submit registration
9. Verify redirect to household page
10. Validate all data persistence

### Error Handling Tests

1. **Ministry Selection Errors** - Graceful handling when no ministries selected
2. **Email Timeout** - Behavior when verification email not retrieved
3. **Form Validation** - Required field validation and error display

## MailHog Integration

### Email Verification Flow

1. **Clear Inbox** - Remove existing emails before test
2. **Account Creation** - Trigger verification email
3. **Email Retrieval** - Poll MailHog API with timeout
4. **Link Extraction** - Parse confirmation URL from email body
5. **Navigation** - Follow link to complete verification

### Supported Email Patterns

The MailHog integration recognizes various confirmation link patterns:
- `/auth/v1/verify` - Supabase auth links
- `/confirm` - Custom confirmation links  
- `/verify` - Generic verification links
- `/magic` - Magic link authentication

## Database Integration

### Ministry Seeding

Ensures test database has required ministries:
```typescript
const ministries = [
  { ministry_id: "test_ministry_1", name: "Sunday School Elementary", min_age: 5, max_age: 10 },
  { ministry_id: "test_ministry_2", name: "Children's Choir", min_age: 4, max_age: 12 },
  // ... 3 more ministries
];
```

### Cleanup Strategy

- **Optional cleanup** after test completion
- **Test isolation** through unique email generation
- **Idempotent seeding** prevents data conflicts

## Troubleshooting

### Common Issues

1. **Browser Installation**
   ```bash
   npx playwright install chromium
   ```

2. **MailHog Connection**
   - Verify MailHog is running on correct port
   - Check MAILHOG_API environment variable
   - Ensure no firewall blocking port 8025

3. **Database Connection**
   - Verify Supabase is running (`supabase status`)
   - Check SUPABASE_URL and SUPABASE_SERVICE_ROLE
   - Ensure database schema includes ministries table

4. **Test Timeouts**
   - Increase timeout for slow email delivery
   - Check application startup time
   - Verify network connectivity to test environment

### Debug Mode

Run tests in debug mode to step through execution:
```bash
npm run test:e2e:debug
```

This opens Playwright Inspector for:
- Step-by-step execution
- DOM inspection
- Network request monitoring
- Console log review

### Test Reports

After test execution, view results:
```bash
npx playwright show-report
```

Provides:
- Test execution timeline
- Screenshots on failure
- Video recordings of test runs
- Network activity logs

## Quality Assurance

### Validation Checklist

- [ ] Tests pass consistently across multiple runs
- [ ] Email verification works with different email addresses
- [ ] Ministry selection persists correctly
- [ ] All consent forms are properly handled
- [ ] Data appears correctly on household page
- [ ] Error scenarios are handled gracefully
- [ ] Test cleanup prevents data conflicts

### Performance Expectations

- **Complete flow**: Under 2 minutes per test
- **Email delivery**: Under 30 seconds typically
- **Form submission**: Under 10 seconds
- **Database operations**: Under 5 seconds

### CI Integration

The test suite integrates with CI/CD pipelines:
- **Automated execution** on pull requests
- **Environment-specific configuration** via .env files
- **Artifact collection** (screenshots, videos, reports)
- **Database state management** between runs

## Contributing

When adding new tests or modifying existing ones:

1. **Follow naming conventions** - Descriptive test names
2. **Use page object patterns** - Reusable element selectors
3. **Add proper wait conditions** - Avoid flaky tests
4. **Include error handling** - Graceful failure scenarios
5. **Update documentation** - Keep README current
6. **Test locally first** - Verify before CI submission

## Integration with Existing Tests

This E2E suite complements existing test infrastructure:
- **Unit tests** - Component and function testing
- **Integration tests** - Database and API testing
- **Email tests** - Existing MailHog integration in `tests/playwright/email/`

The new E2E suite focuses specifically on the complete user journey from account creation to household verification, providing end-to-end confidence in the registration flow.