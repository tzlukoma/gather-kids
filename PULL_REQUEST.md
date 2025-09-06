# Fix for Missing Tables in Supabase Production Environment

## Summary

This PR addresses the issue where only some tables (children, guardians, households, and scriptures) were being created in the Supabase production environment. The following changes have been made:

1. Created a dedicated script (`create_missing_tables.sh`) to handle the 12 missing tables that were identified:

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

2. Enhanced the GitHub workflow (`setup-tables-on-demand.yml`) to:
   - Include a new method option specifically for missing tables
   - Make the missing tables script executable
   - Execute the SQL for the missing tables using the reliable SQL executor

## Testing

This change has been tested by:

1. Running the script locally to verify SQL generation
2. Manually verifying the SQL syntax for all missing tables
3. Ensuring proper foreign key constraints are added after table creation
4. Providing graceful handling of potential errors during execution
5. Fixed SQL syntax for foreign key constraints to be PostgreSQL-compatible (using DO block instead of IF NOT EXISTS)

## Additional Notes

The workflow can now be executed with the `missing-tables` method option, which will only create the previously missing tables without modifying existing ones. This provides a targeted fix while minimizing risk to existing data.

## Deployment Steps

1. Merge this PR
2. Run the GitHub workflow "Setup All Tables (On-Demand)" with:
   - Environment: `production`
   - Method: `missing-tables`
   - Dry Run: `false`
3. Verify that all tables are present in the Supabase dashboard

Fixes issue with missing tables in production
