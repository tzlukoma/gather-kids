# Supabase Migration Troubleshooting Guide

This guide helps troubleshoot and fix common issues with Supabas### 4. Fresh Link and ### 5. Fix UUID to TEXT Conversion

This script safely converts UUID columns to TEXT type:

````bash
./scripts/db/fix_uuid_to_text.sh "postgresql://postgres:your_password@localhost:54322/postgres"
```his script creates a clean setup for linking and pushing to a Supabase project:

```bash
./scripts/db/fresh_link_and_push.sh "your-project-ref" "your-db-password"
```tions, including pgcrypto extension problems and UUID to TEXT conversion issues.

## Common Issues

### "Failed to execute: CREATE TABLE" Error

This error occurs when GitHub Actions workflow tries to create tables that already exist with different structures:

````

Executing: Created households table
Trying direct SQL execution for: Created households table
❌ Failed to execute: Created households table
Manual SQL command (for reference):

---

## CREATE TABLE IF NOT EXISTS households (...)

Error: Process completed with exit code 1.

```

This happens because:
1. The database already contains tables with the same names but different structures
2. There may be permission issues with the database user
3. There could be dependencies (like foreign keys) that are missing

### "Failed to execute: CREATE EXTENSION pgcrypto" Error

This error occurs when the GitHub workflow or Supabase CLI tries to create the pgcrypto extension but the database user doesn't have sufficient privileges:

```

Executing: Created extension pgcrypto
Trying direct SQL execution for: Created extension pgcrypto
❌ Failed to execute: Created extension pgcrypto
Manual SQL command (for reference):

---

## CREATE EXTENSION IF NOT EXISTS pgcrypto;

Error: Process completed with exit code 1.

```

This happens because:

1. The database user doesn't have superuser privileges required to create extensions
2. The extension may be installed in a different schema
3. PostgreSQL version might not support the extension

### "Failed to run migration: ALTER TABLE failed" Error

This error typically occurs when trying to alter column types, particularly when converting UUID columns to TEXT. The error might look like:

```

Error: Failed to run migration: ALTER TABLE "profiles" ALTER COLUMN "id" TYPE text;

````

This happens because:

1. There are foreign key constraints referencing the column
2. The migration attempts to change the type directly without handling the constraints

## Helper Scripts

We've created several helper scripts to diagnose and fix these issues:

### 1. Safe Table Setup

This script safely checks and creates tables, handling existing table structures gracefully:

```bash
./scripts/db/safe_table_setup.sh "your_project_id" "your_access_token" "your_db_password"
````

It will:

- Check if each table already exists before attempting to create it
- Skip table creation if the table is already present
- Continue even if certain tables fail to be created
- Provide a summary of which tables exist at the end

### 2. Ensure pgcrypto Extension

This script safely handles pgcrypto extension creation, even without superuser privileges:

```bash
./scripts/db/ensure_pgcrypto.sh "your_db_password" "your_project_id"
```

It will:

- Check if the pgcrypto extension already exists
- Try to create it if it doesn't, with proper error handling
- Continue even if it fails (with appropriate warnings)
- Verify that essential functions like `gen_random_uuid()` are available

### 3. Diagnose Migrations

This script checks the current state of your database schema and migrations:

```bash
./scripts/db/diagnose_migrations.sh "postgresql://postgres:your_password@localhost:54322/postgres"
```

It will:

- Check if tables mentioned in migrations exist
- Show column types for ID columns
- List foreign key constraints
- Display the status of applied migrations

### 2. Fresh Link and Push

This script creates a clean setup for linking and pushing to a Supabase project:

```bash
./scripts/db/fresh_link_and_push.sh "your-project-ref" "your-db-password"
```

It will:

- Create fresh temp directories
- Run a full Supabase link command
- Check and clean the project-ref file
- Create and push a test migration
- Attempt to push the main migrations in dry-run mode

### 3. Fix UUID to TEXT Conversion

This script safely converts UUID columns to TEXT type:

```bash
./scripts/db/fix_uuid_to_text.sh "postgresql://postgres:your_password@localhost:54322/postgres"
```

It will:

- Check each relevant table and column
- Safely convert UUID columns to TEXT by:
  - Creating a temporary TEXT column
  - Copying the UUID values as TEXT
  - Dropping the original column
  - Renaming the temporary column to the original name

## Step-by-Step Resolution Process

### For pgcrypto Extension Issues:

1. **Use our safe pgcrypto script**:

   ```bash
   ./scripts/db/ensure_pgcrypto.sh "your-db-password" "your-project-id"
   ```

2. **Update the workflow**:
   Ensure the prod-deploy.yml workflow calls the ensure_pgcrypto.sh script before attempting other database operations.

3. **Check if the extension is available in the database**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
   ```

### For UUID to TEXT Conversion Issues:

1. **Diagnose the issue**:

   ```bash
   ./scripts/db/diagnose_migrations.sh "your-connection-string"
   ```

2. **Fix UUID columns manually**:

   ```bash
   ./scripts/db/fix_uuid_to_text.sh "your-connection-string"
   ```

3. **Retry the migration**:

   ```bash
   supabase db push
   ```

4. If issues persist with project linking:
   ```bash
   ./scripts/db/fresh_link_and_push.sh "your-project-ref" "your-db-password"
   ```

## Additional Tips

- Always create a database backup before running migrations
- Consider adding `IF EXISTS` clauses to your migration SQL
- For complex schema changes, consider breaking them into multiple migrations
- Test migrations against a copy of your production database before applying them to production

## Relevant Documentation

- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/usage)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
