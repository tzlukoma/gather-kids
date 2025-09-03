# Create Missing Tables Script

This script generates SQL statements specifically for the tables that were missing in the Supabase production environment. It addresses the issue where only some tables (children, guardians, households, and scriptures) were being created during deployment.

## Purpose

The script:

1. Creates SQL statements for the following missing tables:

   - bible_bee_years
   - branding_settings
   - child_year_profiles
   - competition_years
   - divisions
   - enrollment_overrides
   - essay_prompts
   - incidents
   - leader_assignments
   - ministry_leaders
   - registrations
   - timeslots

2. Adds appropriate foreign key constraints to ensure data integrity
3. Uses PostgreSQL-compatible syntax for foreign key constraints
4. Provides error handling for graceful execution

## Usage

### Local Usage

```bash
./create_missing_tables.sh
```

This will:

1. Generate a SQL file at `/tmp/missing_tables_setup.sql`
2. Display the SQL content for manual verification
3. Provide instructions for execution

### GitHub Workflow Usage

Use the workflow file `setup-tables-on-demand.yml` with the following parameters:

- Environment: `production` (or `staging`)
- Method: `missing-tables`
- Dry Run: `false` (or `true` to verify without making changes)

## Output

The script generates SQL that:

1. Creates all missing tables with appropriate columns and constraints
2. Uses `IF NOT EXISTS` for table creation to prevent errors if tables already exist
3. Uses a PL/pgSQL DO block with conditional checks for foreign key constraints
4. Includes proper error handling within the DO block

## Related Files

- `execute_sql_reliable.sh`: Used to execute the generated SQL reliably with multiple fallback methods
- `setup-tables-on-demand.yml`: GitHub workflow file that uses this script

## Troubleshooting

If you encounter issues:

1. Check Supabase access credentials and permissions
2. Verify network connectivity to the Supabase instance
3. Consider running the SQL manually in the Supabase SQL Editor

## Important Notes

- PostgreSQL does not support `ADD CONSTRAINT IF NOT EXISTS` syntax directly
- This script uses a safer approach with a DO block and conditional checks
- Foreign key constraints are only added if they don't already exist
- Error handling is included to catch any issues during constraint creation
