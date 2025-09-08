# Supabase Environment Configuration

This document provides guidance on setting up and managing environment configurations for different deployment targets (development, testing, UAT, production) when using Supabase with gatherKids.

## Overview

When working with Supabase, proper environment configuration is essential to ensure:

1. Development doesn't impact production data
2. Testing can be performed in isolation
3. Credentials are managed securely
4. Deployment processes are predictable and reliable

This guide covers the configuration approach for all deployment targets and provides templates for each environment.

## Environment Configuration Hierarchy

gatherKids uses a hierarchical approach to environment configuration:

```
.env.local                   # Local development (not committed to git)
.env.test                    # Testing environment
.env.development             # Development deployment
.env.preview                 # Preview/UAT environment
.env.production              # Production environment
```

## Required Environment Variables

The following variables are required for Supabase connectivity in all environments:

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
```

Additional optional variables for controlling features:

```
NEXT_PUBLIC_USE_SUPABASE=true|false      # Enable/disable Supabase (uses IndexedDB if false)
NEXT_PUBLIC_ENABLE_REALTIME=true|false   # Enable/disable realtime subscriptions
```

## Setting Up Local Development

Create a `.env.local` file in the repository root with the following:

```env
# Basic configuration
NEXT_PUBLIC_APP_NAME=gatherKids
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=development

# Feature flags
NEXT_PUBLIC_SHOW_DEMO_FEATURES=true
NEXT_PUBLIC_ENABLE_AI_FEATURES=false

# Supabase development instance
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-supabase-service-role-key>
NEXT_PUBLIC_ENABLE_REALTIME=true

# For local Supabase development (if using Docker)
SUPABASE_DB_PASSWORD=postgres
```

For local development, it's recommended to use the Supabase CLI to run a local instance:

```bash
supabase start
```

## Setting Up Testing Environment

Create a `.env.test` file in the repository root:

```env
# Basic configuration
NEXT_PUBLIC_APP_NAME=gatherKids
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=test

# Feature flags - disable external dependencies for tests
NEXT_PUBLIC_SHOW_DEMO_FEATURES=false
NEXT_PUBLIC_ENABLE_AI_FEATURES=false

# Supabase - use IndexedDB mock for most tests
NEXT_PUBLIC_USE_SUPABASE=false

# For Supabase-specific tests, configure test project
SUPABASE_TEST_URL=<test-project-url>
SUPABASE_TEST_ANON_KEY=<test-project-anon-key>
SUPABASE_TEST_SERVICE_ROLE_KEY=<test-project-service-role-key>
```

## Setting Up Deployment Environments

### Development Deployment Environment

Create a `.env.development` file:

```env
# Basic configuration
NEXT_PUBLIC_APP_NAME=gatherKids
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=development

# Feature flags
NEXT_PUBLIC_SHOW_DEMO_FEATURES=true
NEXT_PUBLIC_ENABLE_AI_FEATURES=false

# Supabase development project
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<dev-service-role-key>
NEXT_PUBLIC_ENABLE_REALTIME=true
```

### Preview/UAT Environment

Create a `.env.preview` file:

```env
# Basic configuration
NEXT_PUBLIC_APP_NAME=gatherKids
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=production

# Feature flags
NEXT_PUBLIC_SHOW_DEMO_FEATURES=true
NEXT_PUBLIC_ENABLE_AI_FEATURES=false

# Supabase UAT project
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-uat-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<uat-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<uat-service-role-key>
NEXT_PUBLIC_ENABLE_REALTIME=true
```

### Production Environment

Create a `.env.production` file:

```env
# Basic configuration
NEXT_PUBLIC_APP_NAME=gatherKids
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=production

# Feature flags
NEXT_PUBLIC_SHOW_DEMO_FEATURES=false
NEXT_PUBLIC_ENABLE_AI_FEATURES=false

# Supabase production project
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>
NEXT_PUBLIC_ENABLE_REALTIME=true
```

## CI/CD Environment Configuration

### GitHub Actions

Add the following secrets to your GitHub repository:

- `SUPABASE_DEV_URL`
- `SUPABASE_DEV_ANON_KEY`
- `SUPABASE_DEV_SERVICE_ROLE_KEY`
- `SUPABASE_UAT_URL`
- `SUPABASE_UAT_ANON_KEY`
- `SUPABASE_UAT_SERVICE_ROLE_KEY`
- `SUPABASE_PROD_URL`
- `SUPABASE_PROD_ANON_KEY`
- `SUPABASE_PROD_SERVICE_ROLE_KEY`

Example GitHub Actions workflow that sets up environment variables:

```yaml
name: Deploy to Preview

on:
  push:
    branches:
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Create env file
        run: |
          echo "NEXT_PUBLIC_APP_NAME=gatherKids" >> .env.preview
          echo "NEXT_PUBLIC_APP_VERSION=1.0.0" >> .env.preview
          echo "NODE_ENV=production" >> .env.preview
          echo "NEXT_PUBLIC_SHOW_DEMO_FEATURES=true" >> .env.preview
          echo "NEXT_PUBLIC_ENABLE_AI_FEATURES=false" >> .env.preview
          echo "NEXT_PUBLIC_USE_SUPABASE=true" >> .env.preview
          echo "NEXT_PUBLIC_SUPABASE_URL=${{ secrets.SUPABASE_UAT_URL }}" >> .env.preview
          echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.SUPABASE_UAT_ANON_KEY }}" >> .env.preview
          echo "SUPABASE_SERVICE_ROLE_KEY=${{ secrets.SUPABASE_UAT_SERVICE_ROLE_KEY }}" >> .env.preview
          echo "NEXT_PUBLIC_ENABLE_REALTIME=true" >> .env.preview
```

### Vercel Deployment

When deploying to Vercel, configure environment variables in the Vercel project settings:

1. Go to your project on Vercel
2. Navigate to Settings > Environment Variables
3. Add the required variables for each environment (Production, Preview, Development)

## Database Schema Management

### Running Migrations in Different Environments

Migrations are raw SQL files in `supabase/migrations/`. Use the Supabase CLI or repository helper scripts to apply them.

```bash
# Development (create a new timestamped SQL migration)
supabase migration new "<change_name>"

# Apply migrations to local or remote DB
supabase migration up

# For CI or non-interactive deploys, ensure DATABASE_URL is set and use the repo scripts that apply migrations
scripts/db/apply_migrations_safe.sh "$DATABASE_URL"
```

For CI/CD pipelines, run `supabase migration up` (or the repo helper script) against the target `DATABASE_URL`.

### Safe Migration Process

Follow this process for safe database migrations:

1. Develop and test migrations locally
2. Apply migrations to development environment
3. Apply migrations to UAT/preview environment and test
4. Apply migrations to production using the `scripts/db/apply_migrations_safe.sh` script

Example usage:

```bash
bash scripts/db/apply_migrations_safe.sh "$PROD_DATABASE_URL"
```

## Row Level Security (RLS) and Policies

When configuring Supabase, ensure each environment has the appropriate Row Level Security (RLS) policies:

### Development Environments (Local/Dev)

More permissive RLS policies that enable easier testing:

```sql
-- Example of development RLS policy
CREATE POLICY "Anyone can view all households"
  ON households FOR SELECT
  USING (true);
```

### UAT and Production Environments

Stricter RLS policies:

```sql
-- Example of production RLS policy
CREATE POLICY "Users can only view their own households"
  ON households FOR SELECT
  USING (auth.uid() = created_by);
```

## Switching Between Adapters

gatherKids supports both IndexedDB and Supabase as database backends. To toggle between them:

```typescript
// In your .env file:
NEXT_PUBLIC_USE_SUPABASE = true | false;

// This is handled automatically in the database adapter factory:
import { createDatabaseAdapter } from '@/lib/database/adapter-factory';

const db = createDatabaseAdapter();
```

## Validation and Testing

Before deploying to a higher environment, validate the Supabase connection and configuration:

```typescript
// Test script example
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('Missing Supabase credentials');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
	try {
		const { data, error } = await supabase.from('households').select('count()');

		if (error) {
			console.error('Supabase query error:', error);
			process.exit(1);
		}

		console.log('Supabase connection successful');
		console.log('Found records:', data);
	} catch (err) {
		console.error('Connection test failed:', err);
		process.exit(1);
	}
}

testConnection();
```

## Security Best Practices

1. **Never commit environment files with real credentials** to the repository
2. Use GitHub secrets or other secure secret storage for CI/CD pipelines
3. Limit service role key usage to server-side operations only
4. Rotate keys regularly, especially after team member departures
5. Use different projects for different environments to maintain isolation

## Troubleshooting

### Common Issues

1. **Connection Issues**

   ```
   Error: FetchError: request to https://your-project.supabase.co/rest/v1/households failed
   ```

   Check that your Supabase URL is correct and the project is running.

2. **Authentication Issues**

   ```
   Error: JWT token is invalid
   ```

   Verify that your anon key is correct and has not expired.

3. **RLS Policy Issues**
   ```
   Error: new row violates row-level security policy
   ```
   Check that your RLS policies are correctly configured for the operation.

### Diagnostic Commands

```bash
# Check if environment variables are loaded
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"

# Test database connection
npx ts-node scripts/test-db-connection.ts

# Verify RLS policies
supabase db dump -f rls_policies.sql --data-only --table auth.policies
```

## Resources

- [Supabase Documentation](https://supabase.io/docs)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Migrations & CLI](https://supabase.com/docs/guides/database)
- [Supabase CLI](https://supabase.io/docs/reference/cli)

## Conclusion

Proper environment configuration is critical for maintaining separation between development, testing, and production environments when working with Supabase. By following these guidelines, you can ensure that your gatherKids application connects to the appropriate database in each environment while maintaining security and data integrity.
