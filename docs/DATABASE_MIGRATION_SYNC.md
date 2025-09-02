# Database Migration Sync Analysis

## Overview

This document summarizes an analysis of the database structure currently used in the gatherKids application and the corresponding migration scripts. The goal is to identify any database structures that are not represented in migration scripts to ensure all environments (development, testing, UAT, production) have the same database schema.

## Analysis Results

### Existing Migration Files

The application has 22+ migration files that incrementally build up the database schema:

1. `0001_init.sql` - Initial database setup
2. `0002_add_households_children.sql` - Adds household and children tables
   ...
3. `0022_add_emergency_contacts_household_uuid.sql` - Adds UUID surrogate to emergency contacts

There's also a squashed schema file (`9999_squashed_schema.sql`) that contains a consolidated view of the schema for reference.

### Missing Tables

The following tables are referenced in the application code (specifically in `src/lib/database/supabase-adapter.ts`), but do not appear to have corresponding migration scripts:

1. `branding_settings` - For organization branding configuration
2. `bible_bee_years` - For Bible Bee competition years
3. `divisions` - For Bible Bee divisions
4. `essay_prompts` - For Bible Bee essay requirements
5. `enrollment_overrides` - For manual division placements

### Solution

A new migration file (`0023_add_missing_tables.sql`) has been created to add these missing tables. This ensures that all environments will have a consistent schema when this migration is applied.

## Recommendations

1. **Apply the New Migration**: Apply the `0023_add_missing_tables.sql` migration to all environments to ensure schema consistency.

2. **Schema Validation Process**: Implement a regular schema validation process to catch discrepancies between environments. This could include:

   - Database schema comparison tools
   - Automated tests that verify schema consistency
   - Documentation of schema changes outside of migrations

3. **Migration First Practice**: Adopt a "migration first" practice where database schema changes are always made through migrations before code that depends on them is deployed.

4. **Update Squashed Schema**: After applying the new migration, update the squashed schema file (`9999_squashed_schema.sql`) to include these new tables.

## How to Apply the Migration

### Development Environment

```bash
supabase migration apply --project-ref your-dev-project
```

### UAT Environment

```bash
supabase migration apply --project-ref your-uat-project
```

### Production Environment

Using the safe migration script:

```bash
bash scripts/db/apply_migrations_safe.sh "$PROD_DATABASE_URL"
```

## Verification

After applying the migrations, verify that all tables exist by running:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Compare the output with the expected list of tables from the application code.

## Conclusion

Keeping the database schema synchronized across all environments is critical for consistent application behavior and preventing unexpected errors. The migration added in this analysis will help ensure that all environments have the same structure. Moving forward, maintaining the discipline of creating migrations for all schema changes will prevent similar issues in the future.
