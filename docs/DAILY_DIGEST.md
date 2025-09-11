# Daily Ministry/Admin Digest Emails

This document describes the daily digest email system that automatically sends enrollment summaries to ministry leaders and administrators.

## Overview

The daily digest system sends two types of emails:

1. **Per-Ministry Digest** → sent to each ministry's configured contact email
2. **Admin Digest** → consolidated across all ministries, sent to all admin users

The system runs via GitHub Actions on a daily schedule and uses Mailjet as the email transport.

## Features

- **Scheduled execution**: Runs daily at 7:00 AM ET (11:00 UTC)
- **Manual trigger**: Can be triggered manually via GitHub Actions
- **Checkpoint tracking**: Prevents duplicate sends by tracking last run timestamp
- **Dry run mode**: Test functionality without sending actual emails
- **Flexible transport**: Configurable email provider (Mailjet API currently supported)
- **Error handling**: Failed sends don't advance checkpoint, allowing retry on next run

## Setup Instructions

### 1. Mailjet Account Setup

1. **Sign up** at [mailjet.com](https://mailjet.com) (free plan: 200 emails/day)
2. **Verify your domain** to send from custom addresses:
   - Add DNS records for SPF + DKIM (Mailjet provides them)
   - Once verified, you can use any @yourdomain.com address
3. **Get API credentials**:
   - Navigate to Account → API Keys
   - Copy your `MJ_API_KEY` and `MJ_API_SECRET`

### 2. GitHub Secrets Configuration

Add the following secrets in your repository (Settings → Secrets and variables → Actions):

#### Production Environment (Default)

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key with read access | `eyJ...` |
| `MJ_API_KEY` | Mailjet API public key | `abc123...` |
| `MJ_API_SECRET` | Mailjet API private key | `def456...` |
| `FROM_EMAIL` | Verified sender email address | `no-reply@yourdomain.com` |
| `EMAIL_MODE` | Email transport mode (optional) | `mailjet` |
| `MONITOR_EMAILS` | Comma-separated BCC monitor emails (optional) | `admin@domain.com,monitor@domain.com` |

#### UAT Environment (Optional)

If you want to run digests against UAT environment, add these prefixed secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `UAT_SUPABASE_URL` | UAT Supabase project URL | `https://uat-xxx.supabase.co` |
| `UAT_DATABASE_URL` | Alternative UAT database URL | `https://uat-xxx.supabase.co` |
| `UAT_SUPABASE_SERVICE_ROLE_KEY` | UAT service role key | `eyJ...` |
| `UAT_MJ_API_KEY` | UAT Mailjet API public key | `abc123...` |
| `UAT_MJ_API_SECRET` | UAT Mailjet API private key | `def456...` |
| `UAT_FROM_EMAIL` | UAT sender email address | `no-reply-uat@yourdomain.com` |
| `UAT_MONITOR_EMAILS` | UAT monitor emails (optional) | `uat-admin@domain.com` |

### 3. Database Migration

The system requires a checkpoint table to track the last run timestamp:

```sql
-- This migration is already included in the repository
-- Run: supabase migration up
-- File: supabase/migrations/20250910134652_add_daily_digest_checkpoints.sql
```

## Usage

### Automated Execution

The workflow runs automatically every day at 7:00 AM ET via GitHub Actions cron schedule:

```yaml
# .github/workflows/daily-digest.yml
on:
  schedule:
    - cron: "0 11 * * *" # 7 AM ET (11:00 UTC during EDT)
```

### Manual Execution

1. Go to your repository's **Actions** tab
2. Select **Daily Digest** workflow
3. Click **Run workflow** button
4. **Choose environment**: Select 'PROD' (default) or 'UAT'
5. **Optional**: Enable dry run mode for testing
6. Choose the branch and click **Run workflow**

The workflow will automatically use the appropriate environment-prefixed secrets based on your selection.

### Local Testing

For local development and testing:

1. **Copy environment template**:
   ```bash
   cp .env.digest.example .env.digest.local
   ```

2. **Update with your credentials**:
   ```bash
   # .env.digest.local
   SUPABASE_URL=http://localhost:54321
   SUPABASE_SERVICE_ROLE=your-local-service-key
   MJ_API_KEY=your-mailjet-key
   MJ_API_SECRET=your-mailjet-secret
   FROM_EMAIL=no-reply@yourdomain.com
   EMAIL_MODE=mailjet
   MONITOR_EMAILS=admin@yourdomain.com,monitoring@yourdomain.com
   ```

3. **Run in dry mode** (no actual emails sent):
   ```bash
   # Default environment
   DOTENV_CONFIG_PATH=.env.digest.local DRY_RUN=true node -r dotenv/config scripts/dailyDigest.js
   
   # UAT environment with prefixed variables
   ENVIRONMENT=UAT DOTENV_CONFIG_PATH=.env.digest.uat DRY_RUN=true node -r dotenv/config scripts/dailyDigest.js
   ```

4. **Run with actual sending**:
   ```bash
   # Production environment
   DOTENV_CONFIG_PATH=.env.digest.local node -r dotenv/config scripts/dailyDigest.js
   
   # UAT environment
   ENVIRONMENT=UAT DOTENV_CONFIG_PATH=.env.digest.uat node -r dotenv/config scripts/dailyDigest.js
   ```

## Configuration

### Environment Variables

The system supports environment-specific configuration via prefixed variables.

#### Base Variables (Production Default)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENVIRONMENT` | No | - | Environment prefix (`UAT`, `PROD`, or empty) |
| `SUPABASE_URL` | Yes | - | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | - | Service role key with read access |
| `MJ_API_KEY` | Yes* | - | Mailjet API public key |
| `MJ_API_SECRET` | Yes* | - | Mailjet API private key |
| `FROM_EMAIL` | Yes | - | Verified sender email address |
| `EMAIL_MODE` | No | `mailjet` | Email transport (`mailjet` or `smtp`) |
| `DRY_RUN` | No | `false` | Test mode - logs actions without sending |
| `MONITOR_EMAILS` | No | - | Comma-separated list of BCC monitor emails |

*Required when `EMAIL_MODE=mailjet`

#### Environment-Prefixed Variables

When `ENVIRONMENT=UAT`, the system will look for:
- `UAT_SUPABASE_URL` (or `UAT_DATABASE_URL`)
- `UAT_SUPABASE_SERVICE_ROLE_KEY`
- `UAT_MJ_API_KEY`
- `UAT_MJ_API_SECRET`
- `UAT_FROM_EMAIL`
- `UAT_MONITOR_EMAILS`

If prefixed variables are not found, it falls back to the base variable names.

### Ministry Configuration

Ministries must have a `contact_email` configured to receive digest emails:

```sql
UPDATE ministries 
SET email = 'leader@yourdomain.com' 
WHERE ministry_id = 'your-ministry-id';
```

### Admin Configuration

Users with role `ADMIN` and `is_active = true` will receive the consolidated admin digest.

### Monitor Email Configuration (Optional)

You can configure monitor emails to receive BCC copies of all digest emails for auditing or backup purposes:

```bash
# Single monitor email
MONITOR_EMAILS=admin@yourdomain.com

# Multiple monitor emails (comma-separated)
MONITOR_EMAILS=admin@yourdomain.com,backup@yourdomain.com,audit@yourdomain.com
```

Monitor emails will receive BCC copies of:
- All ministry-specific digest emails
- All admin digest emails

This is useful for:
- **Administrative oversight**: Admins can monitor all digest communications
- **Backup delivery**: Ensure critical emails are received even if primary recipients have issues
- **Audit trail**: Maintain records of all digest emails sent

## Email Templates

### Ministry Digest Email

- **Subject**: `New Enrollments for [Ministry Name] - Daily Digest`
- **Content**: List of new child enrollments with:
  - Child name and date of birth
  - Household information and contact email
  - Enrollment timestamp

### Admin Digest Email

- **Subject**: `New Ministry Enrollments - Admin Daily Digest ([X] total)`
- **Content**: Consolidated view across all ministries with:
  - Total enrollment count
  - Breakdown by ministry
  - All child and household details

## Monitoring and Troubleshooting

### GitHub Actions Logs

1. Go to **Actions** tab in your repository
2. Click on **Daily Digest** workflow
3. View logs for specific runs to see:
   - Number of enrollments processed
   - Email sending results
   - Any errors encountered

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Checkpoint table not found" | Migration not run | Run `supabase migration up` |
| "Missing required environment variables" | Secrets not configured | Add secrets in GitHub repository settings |
| "No new enrollments found" | Normal operation | No action needed - checkpoint still updated |
| Email sending failures | Invalid Mailjet credentials or domain not verified | Verify Mailjet setup and domain configuration |

### Manual Checkpoint Reset

If you need to re-send emails for a specific time period:

```sql
-- Reset checkpoint to send emails from 3 days ago
UPDATE daily_digest_checkpoints 
SET last_run_at = NOW() - INTERVAL '3 days'
WHERE checkpoint_name = 'daily_digest';
```

## Testing

### Automated Tests

Run the test suite:

```bash
npm test -- --testPathPatterns="daily-digest"
```

### Manual Testing Checklist

- [ ] Seed test data with new enrollments in multiple ministries
- [ ] Trigger workflow manually
- [ ] Verify ministry leaders receive only their enrollments
- [ ] Verify admins receive consolidated digest
- [ ] Test with no new enrollments (should skip sending)
- [ ] Test with ministry missing contact email (should skip with log)
- [ ] Test failure recovery (checkpoint not advanced on failure)

## Future Enhancements

- [ ] SMTP transport support for other email providers
- [ ] Email template customization
- [ ] Frequency configuration (weekly/monthly digests)
- [ ] Unsubscribe functionality
- [ ] Rich HTML email templates with branding
- [ ] Attachment support for detailed reports

## Support

For issues or questions:

1. Check GitHub Actions logs for error details
2. Review this documentation for configuration requirements
3. Create an issue in the repository with:
   - Error messages from logs
   - Environment configuration (without sensitive values)
   - Steps to reproduce the issue