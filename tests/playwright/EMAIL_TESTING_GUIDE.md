# Email Verification Testing Guide

This guide covers the two different email verification test flows available for the gatherKids application.

## Overview

The application supports two distinct authentication and registration patterns:

1. **Magic Link Flow**: One-step authentication where the email link directly authenticates the user
2. **Email/Password Flow**: Traditional two-step process with account creation and email verification

## Test Suites

### 1. Magic Link Registration Tests (`registration-auth-flow.spec.ts`)

**Purpose**: Tests the modern Magic Link authentication flow where users receive a link that both verifies their email and authenticates them for registration.

**Test Scenarios**:
- Complete registration flow from email entry to parent portal
- Expired magic link handling
- Invalid email format validation
- Email content and formatting verification
- Multiple registrations with cleanup

**Flow**:
1. User enters email on registration page
2. System sends magic link email
3. User clicks magic link → automatically authenticated
4. User completes family registration form
5. User accesses parent portal

**Command**: `npm run test:email:magic`

### 2. Email/Password Registration Tests (`email-password-verification.spec.ts`)

**Purpose**: Tests the traditional email/password registration flow where users must verify their email address before they can complete registration.

**Test Scenarios**:
- Complete email/password registration with verification
- Password validation and security requirements
- Expired verification link handling
- Unverified email login prevention
- Email content verification
- Resend verification email functionality

**Flow**:
1. User creates account with email/password
2. System sends email verification link
3. User clicks verification link → email verified (but not authenticated)
4. User logs in with email/password
5. User completes family registration form
6. User accesses parent portal

**Command**: `npm run test:email:password`

## Key Differences

| Aspect | Magic Link | Email/Password |
|--------|------------|----------------|
| **Authentication** | Single-step (link authenticates) | Two-step (verify + login) |
| **Security** | Higher (no password to compromise) | Traditional (password-based) |
| **User Experience** | Simpler (one click) | More familiar |
| **Email Purpose** | Authentication + verification | Verification only |
| **MVP Readiness** | May not be MVP | Likely MVP candidate |

## Running Tests

### All Email Tests
```bash
npm run test:email
```

### Magic Link Tests Only
```bash
npm run test:email:magic
```

### Email/Password Tests Only
```bash
npm run test:email:password
```

### Interactive UI Mode
```bash
npm run test:email:ui
```

## Test Infrastructure

### MailHog Integration
Both test suites use MailHog for email testing:
- **Setup**: Automatically started by global setup
- **Cleanup**: Emails cleared between tests
- **Port**: 8025 (web UI), 1025 (SMTP)

### Email Utilities
- `MailHogHelper.extractMagicLink()`: For magic link authentication
- `MailHogHelper.extractVerificationLink()`: For email verification links
- Automatic email polling and content extraction

### Page Objects
- `EmailRegistrationPage`: Magic link flow interactions
- `EmailPasswordRegistrationPage`: Email/password flow interactions

## Debugging

### Email Content Issues
- Check MailHog web UI at http://localhost:8025
- Review email body content in test output
- Verify link extraction patterns

### Test Failures
- Enable video recording: Tests record on failure
- Screenshot on failure: Available in playwright-report
- Console logs: Browser console output captured

### Environment Issues
- Ensure MailHog is running (`docker ps`)
- Check port conflicts (8025, 1025)
- Verify email service configuration

## Implementation Notes

### Magic Link Implementation
- Uses `/api/auth/magic-link` endpoint
- Integrates with Supabase Auth (when configured)
- Falls back to MailHog for testing

### Email/Password Implementation
- Uses `/create-account` page for registration
- Uses Supabase Auth for account creation
- Requires email verification before login

### Feature Flags
Both flows respect feature flags:
- `loginMagicEnabled`: Controls magic link availability
- `loginPasswordEnabled`: Controls password auth
- `isDemoMode`: Affects authentication behavior

## Best Practices

1. **Test Isolation**: Each test clears emails before/after
2. **Realistic Data**: Use unique timestamps in test emails
3. **Error Handling**: Tests gracefully handle missing features
4. **Timeouts**: Email delivery can take time, use appropriate timeouts
5. **Cleanup**: Always clear test data between runs

## Troubleshooting

### Common Issues

**MailHog Not Available**
```bash
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

**Tests Timeout Waiting for Email**
- Check MailHog logs
- Verify email service configuration
- Increase timeout values

**Link Extraction Fails**
- Check email HTML content
- Verify link patterns in MailHogHelper
- Test email templates manually

**Feature Not Available**
- Check feature flags configuration
- Verify environment variables
- Review application logs