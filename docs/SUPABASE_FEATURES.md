# Supabase Features Guide

This document describes how to use key Supabase features in this project that aren't directly configured in the `config.toml` file.

## Type Generation

Type generation is handled through a custom script rather than through `config.toml`. We have NPM scripts configured to generate TypeScript types from your Supabase schema:

```bash
# Generate types from local Supabase instance
npm run gen:types

# Generate types from production Supabase project (requires SUPABASE_PROJECT_ID env variable)
npm run gen:types:prod
```

The script (`scripts/gen-types.cjs`) will automatically:

- Run the Supabase CLI type generation command
- Process the output types (renaming Json to SupabaseJson)
- Save the result to `src/lib/database/supabase-types.ts`
- Create fallback types if Supabase CLI is not available

## Migration Timestamps

Migration timestamps are enabled by default in the Supabase CLI. When you create a new migration file using:

```bash
supabase migration new your_migration_name
```

The CLI will automatically create a file with a timestamp prefix: `YYYYMMDDHHMMSS_your_migration_name.sql`.

There is no additional configuration needed for this feature.

## Workflow for Database Changes

1. Create a new migration:

   ```bash
   supabase migration new add_my_new_table
   ```

2. Edit the generated migration file in `supabase/migrations/YYYYMMDDHHMMSS_add_my_new_table.sql`

3. Apply the migration:
   ```bash
   supabase db reset
   ```
4. Generate updated TypeScript types:

   ```bash
   npm run gen:types
   ```

5. When ready to deploy:
   ```bash
   supabase db push
   ```

## Troubleshooting

### Migration File Not Created with Timestamp

If migration files are created without timestamps (e.g., `add_my_new_table.sql` instead of `YYYYMMDDHHMMSS_add_my_new_table.sql`), check:

1. Your Supabase CLI version (run `supabase --version`)
2. Update to the latest CLI version if needed
3. Ensure you're running the command from your project root directory

### Type Generation Fails

If type generation fails:

1. Check if Supabase CLI is installed and working (`supabase --version`)
2. Verify your local Supabase instance is running (`supabase status`)
3. For production type generation, ensure the `SUPABASE_PROJECT_ID` environment variable is set correctly
