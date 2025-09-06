# MailHog Email Testing Setup

This document explains how MailHog is integrated into the gatherKids project for email verification testing in CI/CD and local development.

## Overview

MailHog is an email testing tool that captures emails sent by the application during testing, allowing Playwright tests to access magic links and verification emails without needing a real email service.

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Application    │───▶│   MailHog    │◀───│ Playwright Test │
│ (sends emails)  │    │ (SMTP + API) │    │ (reads emails)  │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

### Components

1. **MailHog SMTP Server** (port 1025): Receives emails from the application
2. **MailHog Web UI** (port 8025): Web interface for viewing emails
3. **MailHog API** (http://localhost:8025/api/v2): REST API for programmatic access
4. **Email Service** (`src/lib/email-service.ts`): Sends verification emails
5. **MailHog Helper** (`tests/playwright/utils/mailhog.ts`): Playwright utilities

## CI/CD Integration

### GitHub Actions Workflow

The email verification tests run in the `e2e-email-tests.yml` workflow:

```yaml
services:
  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - 1025:1025  # SMTP
      - 8025:8025  # Web UI
```

### Environment Variables

The following environment variables configure email testing:

```env
# Email service configuration
SMTP_HOST=localhost
SMTP_PORT=1025
MAILHOG_API_URL=http://localhost:8025

# Feature flags
NEXT_PUBLIC_LOGIN_MAGIC_ENABLED=true
NEXT_PUBLIC_DEMO_MODE=false
```

### Workflow Trigger

Tests run automatically on:
- Pull request approval
- Push to main branch
- Manual workflow dispatch

## Local Development Setup

### 1. Start MailHog Locally

**Option A: Docker (Recommended)**
```bash
docker run -d \
  -p 1025:1025 \
  -p 8025:8025 \
  --name mailhog \
  mailhog/mailhog
```

**Option B: Binary Installation**
```bash
# Download from GitHub releases
wget https://github.com/mailhog/MailHog/releases/download/v1.0.1/MailHog_linux_amd64
chmod +x MailHog_linux_amd64
./MailHog_linux_amd64
```

### 2. Configure Environment

Create `.env.local` with email testing configuration:

```env
# Email testing (local)
SMTP_HOST=localhost
SMTP_PORT=1025
MAILHOG_API_URL=http://localhost:8025

# Enable magic links for testing
NEXT_PUBLIC_LOGIN_MAGIC_ENABLED=true

# Other required variables...
NEXT_PUBLIC_APP_NAME=gatherKids
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key
```

### 3. Run Tests

```bash
# Run all email verification tests
npm run test:email

# Run specific test file
npx playwright test --config=playwright-email.config.ts registration-auth-flow.spec.ts

# Run tests with UI
npx playwright test --config=playwright-email.config.ts --ui
```

### 4. Access MailHog Web UI

Visit http://localhost:8025 to view captured emails in the web interface.

## Test Structure

### Test Files

- `tests/playwright/email/registration-auth-flow.spec.ts` - Main registration flow test
- `tests/playwright/email/global-setup.ts` - Test environment setup
- `tests/playwright/email/global-teardown.ts` - Test cleanup

### Page Objects

- `tests/playwright/page-objects/email-registration.page.ts` - Registration flow interactions

### Utilities

- `tests/playwright/utils/mailhog.ts` - MailHog API helper functions

## Email Verification Flow

### 1. User Registration
```typescript
// User enters email on registration page
await emailPage.enterEmailForVerification('user@example.com');
```

### 2. Magic Link Email
```typescript
// Application sends magic link via MailHog
const response = await fetch('/api/auth/magic-link', {
  method: 'POST',
  body: JSON.stringify({ email: 'user@example.com' })
});
```

### 3. Email Capture
```typescript
// Test retrieves email from MailHog
const email = await mailhog.getLatestEmail(30000, 'user@example.com');
```

### 4. Magic Link Extraction
```typescript
// Test extracts magic link from email content
const magicLink = await mailhog.extractMagicLink(email);
```

### 5. Authentication
```typescript
// Test navigates to magic link
await page.goto(magicLink);
```

### 6. Registration Completion
```typescript
// Test completes registration form
await emailPage.fillRegistrationForm(registrationData);
await emailPage.submitRegistration();
```

## API Endpoints

### POST /api/auth/magic-link

Sends a magic link verification email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Verification email sent successfully",
  "email": "user@example.com"
}
```

**Error Responses:**
- `400` - Invalid email format
- `503` - Magic links not enabled
- `500` - Email sending failed

## MailHog API Usage

### Key Endpoints

- `GET /api/v2/messages` - Get all messages
- `DELETE /api/v2/messages` - Clear all messages
- `GET /api/v2/messages/{id}` - Get specific message
- `DELETE /api/v2/messages/{id}` - Delete specific message

### Helper Functions

```typescript
// Wait for email with timeout
const email = await mailhog.getLatestEmail(30000, 'user@example.com');

// Extract magic link from email
const magicLink = await mailhog.extractMagicLink(email);

// Clean up test emails
await mailhog.clearAllEmails();

// Check email count
const count = await mailhog.getEmailCount();
```

## Error Scenarios Tested

### 1. Expired Magic Links
- Tests handle expired/invalid magic links gracefully
- Verifies appropriate error messages are shown

### 2. Invalid Email Formats
- Tests various invalid email formats
- Ensures validation prevents submission

### 3. Email Service Unavailable
- Tests graceful handling when MailHog is down
- Provides meaningful error messages

### 4. Multiple Registrations
- Tests email cleanup between registrations
- Ensures no email cross-contamination

## Troubleshooting

### Common Issues

**MailHog not starting in CI:**
```bash
# Check if MailHog service is running
curl -f http://localhost:8025/api/v2/messages
```

**Emails not being captured:**
- Verify SMTP configuration points to localhost:1025
- Check that magic links are enabled
- Ensure MailHog service is running

**Magic link extraction failing:**
- Check email content format in MailHog web UI
- Verify regex patterns in `mailhog.ts`
- Look for HTML encoding issues

**Tests timing out:**
- Increase email wait timeouts
- Check application startup time
- Verify network connectivity

### Debug Commands

```bash
# Check MailHog logs
docker logs mailhog

# Test SMTP connection
telnet localhost 1025

# Verify API accessibility
curl http://localhost:8025/api/v2/messages

# Check email content
curl http://localhost:8025/api/v2/messages | jq '.items[0].Content.Body'
```

### Local Development Tips

1. **Keep MailHog running** during development for consistent testing
2. **Clear emails manually** via web UI when debugging
3. **Use browser dev tools** to inspect network requests
4. **Check console logs** for email sending errors
5. **Verify environment variables** are set correctly

## Performance Considerations

- **Email timeouts**: Set appropriate timeouts for email delivery (30s default)
- **Test isolation**: Clear emails between tests to prevent interference
- **Resource cleanup**: Always clean up emails in teardown
- **Parallel execution**: Disabled for email tests to prevent race conditions

## Security Notes

- MailHog is for **testing only** - never use in production
- Magic links in tests have **mock implementations**
- Real Supabase auth used only when properly configured
- Test emails use **dummy domains** to prevent accidental sends

## Future Improvements

### Planned Enhancements

1. **Template testing** - Verify email template rendering
2. **Localization testing** - Test emails in multiple languages  
3. **Mobile testing** - Test magic links on mobile browsers
4. **Performance testing** - Test email delivery under load
5. **Integration testing** - Test with real email providers

### Configuration Options

Future environment variables for enhanced testing:

```env
# Advanced MailHog configuration
MAILHOG_STORAGE_TYPE=memory|maildir
MAILHOG_CORS_ORIGIN=*
MAILHOG_WEBHOOK_URL=http://localhost:3000/webhook

# Email testing features
EMAIL_TEST_TEMPLATE_VALIDATION=true
EMAIL_TEST_SPAM_CHECKING=true
EMAIL_TEST_DELIVERY_SIMULATION=true
```

## Resources

- [MailHog Documentation](https://github.com/mailhog/MailHog)
- [Playwright Testing Guide](https://playwright.dev/docs/intro)
- [Node.js Nodemailer](https://nodemailer.com/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)