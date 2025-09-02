# Database Environment Setup Guide

This guide provides step-by-step instructions for setting up gatherKids database environments across development, UAT (preview), and production using Supabase and Vercel. This guide covers all non-code setup required including environment variables and platform settings.

## Prerequisites

Before beginning this setup, ensure you have:

- [ ] Supabase account with appropriate permissions
- [ ] Vercel account with project access
- [ ] GitHub repository access with Actions permissions
- [ ] Basic understanding of PostgreSQL and environment variables

## Environment Configuration Overview

gatherKids uses separate Supabase projects for each environment to ensure strong isolation:

- **Development**: Local development with optional local Supabase CLI or UAT project connection
- **UAT/Preview**: Dedicated Supabase project for testing and preview deployments
- **Production**: Dedicated Supabase project for live application

## 1. Supabase Project Setup

### 1.1 Create Supabase Projects

Create separate Supabase projects for each environment:

- [ ] **UAT Project**: Create new project in Supabase dashboard
  - Project name: `gatherkids-uat` (or similar)
  - Region: Choose closest to your users
  - Note the project reference ID (visible in project URL)

- [ ] **Production Project**: Create new project in Supabase dashboard  
  - Project name: `gatherkids-prod` (or similar)
  - Region: Same as UAT for consistency
  - Note the project reference ID (visible in project URL)

### 1.2 Configure Database URLs

For each Supabase project, construct the database URLs:

- [ ] **UAT Database URL**:
  ```
  postgresql://postgres:<password>@db.<uat-ref>.supabase.co:5432/postgres?sslmode=require
  ```

- [ ] **Production Database URL**:
  ```
  postgresql://postgres:<password>@db.<prod-ref>.supabase.co:5432/postgres?sslmode=require
  ```

**Important**: Always include `?sslmode=require` at the end of database URLs for CI/CD workflows.

### 1.3 Collect Supabase Credentials

For each project (UAT and Production), collect the following from Project Settings → API:

- [ ] **Project URL**: `https://<project-ref>.supabase.co`
- [ ] **Project Reference ID**: `<project-ref>` (for CLI commands)
- [ ] **Anon (public) key**: `eyJ...` (safe for browser)
- [ ] **Service role key**: `eyJ...` (server-side only, keep secure)
- [ ] **Database password**: Found in Project Settings → Database

### 1.4 Configure Authentication

In each Supabase project's Authentication settings:

- [ ] **Site URL Configuration**:
  - UAT: `https://<your-uat-domain>.vercel.app` or custom domain
  - Production: `https://<your-production-domain>` 

- [ ] **Redirect URLs** (add all that apply):
  - UAT: `https://<uat-domain>.vercel.app/auth/callback`
  - Production: `https://<prod-domain>/auth/callback`
  - Development: `http://localhost:3000/auth/callback` (for local testing)

- [ ] **Enable/Disable Auth Providers**:
  - Email/Password: Enable for all environments
  - Magic Link: Enable for production, optional for UAT
  - Google OAuth: Configure as needed (requires Google Cloud setup)

### 1.5 Configure Row Level Security (RLS)

After running initial migrations, configure RLS policies appropriate for each environment:

- [ ] **Development/UAT**: May use relaxed policies for testing
- [ ] **Production**: Must use strict security policies

Example RLS policy setup will be handled through SQL migrations.

## 2. GitHub Actions Environment Setup

### 2.1 Create GitHub Environments

In your GitHub repository, create protected environments:

- [ ] Go to repository Settings → Environments
- [ ] Create **uat** environment:
  - Protection rules: None (auto-deploy on push to uat branch)
  - Environment secrets: Add UAT database credentials
  
- [ ] Create **production** environment:
  - Protection rules: Required reviewers (add team members)
  - Protection rules: Restrict to production branches if desired
  - Environment secrets: Add production database credentials

### 2.2 Configure GitHub Secrets

Add the following secrets to each environment:

#### UAT Environment Secrets
- [ ] `UAT_DATABASE_URL`: Full PostgreSQL connection string with sslmode=require
- [ ] `UAT_SUPABASE_URL`: https://<uat-ref>.supabase.co
- [ ] `UAT_SUPABASE_ANON_KEY`: Public anon key for UAT project
- [ ] `UAT_SUPABASE_SERVICE_ROLE_KEY`: Service role key for UAT project

#### Production Environment Secrets  
- [ ] `PROD_DATABASE_URL`: Full PostgreSQL connection string with sslmode=require
- [ ] `PROD_SUPABASE_URL`: https://<prod-ref>.supabase.co
- [ ] `PROD_SUPABASE_ANON_KEY`: Public anon key for production project
- [ ] `PROD_SUPABASE_SERVICE_ROLE_KEY`: Service role key for production project

### 2.3 Verify Workflow Permissions

Ensure GitHub Actions have necessary permissions:

- [ ] Repository Settings → Actions → General
- [ ] Workflow permissions: "Read and write permissions" (for artifact uploads)
- [ ] Allow GitHub Actions to create and approve pull requests: Enabled if needed

## 3. Vercel Deployment Setup

### 3.1 Connect Repository to Vercel

- [ ] Connect GitHub repository to Vercel project
- [ ] Configure build settings:
  - Framework Preset: Next.js
  - Build Command: `npm run build`
  - Install Command: `npm install`

### 3.2 Configure Vercel Environment Variables

Set up environment variables for each Vercel environment:

#### Development Environment (Vercel)
```env
NEXT_PUBLIC_APP_NAME=gatherKids
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=development
NEXT_PUBLIC_DATABASE_MODE=supabase
NEXT_PUBLIC_LOGIN_MAGIC_ENABLED=false
NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED=true
NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED=false
NEXT_PUBLIC_SUPABASE_URL=https://<uat-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<uat-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<uat-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### Preview Environment (Vercel)
```env
NEXT_PUBLIC_APP_NAME=gatherKids
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=production
NEXT_PUBLIC_DATABASE_MODE=supabase
NEXT_PUBLIC_LOGIN_MAGIC_ENABLED=false
NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED=true
NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED=false
NEXT_PUBLIC_SUPABASE_URL=https://<uat-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<uat-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<uat-service-role-key>
NEXT_PUBLIC_SITE_URL=https://your-preview-domain.vercel.app
```

#### Production Environment (Vercel)
```env
NEXT_PUBLIC_APP_NAME=gatherKids
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=production
NEXT_PUBLIC_DATABASE_MODE=supabase
NEXT_PUBLIC_LOGIN_MAGIC_ENABLED=true
NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED=true
NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED=true
NEXT_PUBLIC_SUPABASE_URL=https://<prod-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<prod-service-role-key>
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

#### Setting Variables in Vercel
- [ ] Go to Vercel project Settings → Environment Variables
- [ ] Add each variable with appropriate environment scope (Production, Preview, Development)
- [ ] Use "Sensitive" option for service role keys and database URLs

### 3.3 Configure Custom Domains (Production)

- [ ] Add custom domain in Vercel project settings
- [ ] Configure DNS records as instructed by Vercel
- [ ] Update `NEXT_PUBLIC_SITE_URL` to match custom domain
- [ ] Update Supabase redirect URLs to match custom domain

## 4. Local Development Setup

### 4.1 Environment File Configuration

Create `.env.local` for local development:

```env
# Application Configuration
NEXT_PUBLIC_APP_NAME=gatherKids
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=development

# Feature Flags
NEXT_PUBLIC_DATABASE_MODE=supabase
NEXT_PUBLIC_LOGIN_MAGIC_ENABLED=false
NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED=true
NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED=false

# Supabase (point to UAT for development, or local if using Supabase CLI)
NEXT_PUBLIC_SUPABASE_URL=https://<uat-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<uat-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<uat-service-role-key>

# Local Development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4.2 Optional: Local Supabase CLI Setup

For full local development with Supabase CLI:

- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Initialize: `supabase init` (if not already done)
- [ ] Start local instance: `supabase start`
- [ ] Update `.env.local` with local URLs:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
  SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
  ```

## 5. Database Migration Strategy

### 5.1 Migration File Organization

- [ ] All migrations stored in `supabase/migrations/`
- [ ] Use timestamp naming: `YYYY-MM-DD-HHMM_description.sql`
- [ ] Each migration should be idempotent (safe to run multiple times)

### 5.2 Migration Deployment Process

#### Development
- [ ] Create and test migrations locally
- [ ] Use `scripts/db/apply_migrations_safe.sh` for local testing

#### UAT Deployment (Automatic)
- [ ] Push changes to `uat` branch
- [ ] GitHub Actions automatically applies migrations
- [ ] Monitor workflow logs for any issues

#### Production Deployment (Manual)
- [ ] Trigger production workflow manually via GitHub Actions
- [ ] Require approval from designated reviewers
- [ ] Monitor application after migration completion

### 5.3 Migration Safety

- [ ] Always test migrations in UAT before production
- [ ] Use transactions where possible
- [ ] Plan rollback strategy for breaking changes
- [ ] Monitor application performance after migrations

## 6. Validation and Testing

### 6.1 Environment Connectivity Test

Create a simple test script to validate environment setup:

```javascript
// test-env.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

(async () => {
  const { error } = await supabase.from('households').select('count').limit(1);
  if (error) { 
    console.error('Supabase connection failed:', error); 
    process.exit(1); 
  }
  console.log('✅ Supabase connection successful');
})();
```

### 6.2 Deployment Verification Checklist

After each environment setup:

- [ ] Application builds successfully
- [ ] Database connection works
- [ ] Authentication flow functions
- [ ] Environment-specific features work as expected
- [ ] No console errors in browser
- [ ] Performance is acceptable

## 7. Security Best Practices

### 7.1 Credential Management

- [ ] Never commit real credentials to version control
- [ ] Use GitHub environment secrets for CI/CD
- [ ] Use Vercel environment variables for deployments
- [ ] Rotate keys periodically
- [ ] Limit service role key usage to server-side only

### 7.2 Network Security

- [ ] Always use `sslmode=require` for database connections
- [ ] Configure appropriate CORS settings in Supabase
- [ ] Use environment-specific redirect URLs
- [ ] Monitor authentication logs for suspicious activity

### 7.3 Access Control

- [ ] Implement proper Row Level Security (RLS) policies
- [ ] Use least-privilege principle for database access
- [ ] Regular review of user permissions
- [ ] Monitor database access patterns

## 8. Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify `sslmode=require` in connection string
- Check network connectivity to Supabase
- Validate credentials are correct for environment

**Authentication Redirect Issues**
- Verify redirect URLs are configured in Supabase
- Check `NEXT_PUBLIC_SITE_URL` matches deployment URL
- Ensure domain is properly configured

**Migration Failures**
- Check migration file syntax
- Verify database permissions
- Review migration logs in GitHub Actions

**Environment Variable Issues**
- Verify all required variables are set
- Check variable names match exactly
- Ensure sensitive variables are marked as such

### Getting Help

- [ ] Review Supabase documentation: https://supabase.com/docs
- [ ] Check Vercel deployment logs
- [ ] Review GitHub Actions workflow logs
- [ ] Monitor application logs and error reports

## 9. Maintenance

### Regular Tasks

- [ ] **Weekly**: Review application logs and performance metrics
- [ ] **Monthly**: Rotate database credentials
- [ ] **Quarterly**: Review and update RLS policies
- [ ] **As needed**: Update environment variable values

### Monitoring

Set up monitoring for:
- [ ] Database performance and connection health
- [ ] Application error rates
- [ ] Authentication success/failure rates
- [ ] Migration deployment success

### Backup Strategy

- [ ] Configure automated backups in Supabase
- [ ] Test backup restoration process
- [ ] Document recovery procedures
- [ ] Store backup encryption keys securely

---

## Completion Checklist

When environment setup is complete, verify:

- [ ] All Supabase projects created and configured
- [ ] GitHub environments and secrets configured
- [ ] Vercel environment variables set correctly
- [ ] Local development environment working
- [ ] Migration workflows tested
- [ ] Security policies implemented
- [ ] Monitoring and alerts configured
- [ ] Documentation updated with environment-specific details

This completes the database environment setup for gatherKids. Each environment should now be properly isolated with secure credential handling and reliable deployment processes.