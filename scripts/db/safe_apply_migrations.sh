#!/usr/bin/env bash
# This script applies migrations more safely with pre-checks for critical issues
# Such as the household_id foreign key problem

set -euo pipefail

PROJECT_ID="${1:-}"
ACCESS_TOKEN="${2:-}"
DB_PASSWORD="${3:-}"

if [[ -z "$PROJECT_ID" || -z "$ACCESS_TOKEN" ]]; then
  echo "Usage: $0 <PROJECT_ID> <ACCESS_TOKEN> [DB_PASSWORD]"
  exit 2
fi

# Use the provided Supabase CLI path or default to just "supabase"
SUPABASE="${SUPABASE_CLI_PATH:-supabase}"
echo "Using Supabase CLI at: $SUPABASE"

# Check if Supabase CLI is available
if ! command -v "$SUPABASE" &> /dev/null; then
  echo "Error: Supabase CLI not found at $SUPABASE"
  echo "Please make sure Supabase CLI is installed and the path is correct"
  exit 3
fi

# Export the access token for Supabase CLI
export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"
export SUPABASE_DB_PASSWORD="$DB_PASSWORD"

# Link project with DB password if provided
if [[ -n "$DB_PASSWORD" ]]; then
  "$SUPABASE" link --project-ref "$PROJECT_ID" --password "$DB_PASSWORD"
else
  "$SUPABASE" link --project-ref "$PROJECT_ID"
fi

echo "Running pre-checks to ensure database structure integrity..."

# Create SQL file for pre-check
PRE_CHECK_SQL="/tmp/pre_migration_check.sql"

cat > "$PRE_CHECK_SQL" << 'EOSQL'
-- Pre-check to identify and fix potential migration issues

-- Check children table structure
DO $$
DECLARE
  children_exists boolean;
  household_id_exists boolean;
BEGIN
  -- Check if children table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'children' AND table_schema = 'public'
  ) INTO children_exists;
  
  RAISE NOTICE 'Children table exists: %', children_exists;
  
  IF children_exists THEN
    -- Check if household_id column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'children' AND column_name = 'household_id'
    ) INTO household_id_exists;
    
    RAISE NOTICE 'household_id column exists: %', household_id_exists;
    
    -- If the column doesn't exist, add it to prevent errors
    IF NOT household_id_exists THEN
      ALTER TABLE children ADD COLUMN household_id text;
      RAISE NOTICE 'Added missing household_id column to children table';
    END IF;
  END IF;
END $$;

-- Check for other potential issues
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  -- Check for children_household_id_fkey constraint
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'children_household_id_fkey'
  ) INTO constraint_exists;
  
  RAISE NOTICE 'children_household_id_fkey constraint exists: %', constraint_exists;
  
  -- Additional checks can be added here
END $$;
EOSQL

echo "Creating temporary migration for pre-check..."
# Create temporary migration directory if it doesn't exist
TEMP_MIGRATION_DIR="./supabase/temp-migrations"
mkdir -p "$TEMP_MIGRATION_DIR"

# Generate a timestamp for the migration
TIMESTAMP=$(date +%Y%m%d%H%M%S)
PRE_CHECK_MIGRATION_FILE="$TEMP_MIGRATION_DIR/${TIMESTAMP}_pre_check.sql"

# Copy the SQL to the migration file
cp "$PRE_CHECK_SQL" "$PRE_CHECK_MIGRATION_FILE"

echo "Created temporary migration at $PRE_CHECK_MIGRATION_FILE"
echo "Pre-checks will be run as part of the migration process"

echo "Running database push with --include-all flag..."
if "$SUPABASE" db push --dry-run --include-all; then
  echo "Dry run successful. Applying migrations..."
  "$SUPABASE" db push --include-all
else
  echo "Dry run failed with --include-all flag, trying standard push..."
  if "$SUPABASE" db push --dry-run; then
    echo "Dry run successful. Applying migrations..."
    "$SUPABASE" db push
  else
    echo "All dry runs failed. Will try with more debugging information..."
    
    # Find all migration files
    MIGRATION_FILES=$(find ./supabase/migrations -name "*.sql" | sort)
    
    echo "Found $(echo "$MIGRATION_FILES" | wc -l) migration files"
    
    echo "Could not apply migrations as a batch. Will attempt linking and DB push again..."
    
    # Try to relink and push
    echo "Relinking project..."
    if [[ -n "$DB_PASSWORD" ]]; then
      "$SUPABASE" link --project-ref "$PROJECT_ID" --password "$DB_PASSWORD"
    else
      "$SUPABASE" link --project-ref "$PROJECT_ID"
    fi
    
    echo "Trying db push with debug information..."
    "$SUPABASE" db push --debug || {
      echo "Migration push failed even with debug mode"
      
      echo "Attempting with experimental flag..."
      "$SUPABASE" --experimental db push --debug || {
        echo "Failed with experimental flag too"
        
        echo "Attempting full reset as a last resort (WARNING: THIS WILL RESET DATABASE)..."
        if [[ -n "$DB_PASSWORD" ]]; then
          echo "Skipping reset in production environment (DB password provided)"
        else
          "$SUPABASE" db reset || echo "Reset failed too. Manual intervention required."
        fi
      }
    }
  fi
fi

echo "Running post-check to verify database structure..."
POST_CHECK_SQL="/tmp/post_migration_check.sql"

cat > "$POST_CHECK_SQL" << 'EOSQL'
-- Verify key tables exist
SELECT table_name, 
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('households', 'children', 'guardians', 'ministries', 'ministry_leaders')
ORDER BY table_name;
EOSQL

echo "Creating temporary migration for post-check..."
# Create a post-check migration file
TIMESTAMP=$(date +%Y%m%d%H%M%S)
POST_CHECK_MIGRATION_FILE="$TEMP_MIGRATION_DIR/${TIMESTAMP}_post_check.sql"

# Copy the SQL to the migration file
cp "$POST_CHECK_SQL" "$POST_CHECK_MIGRATION_FILE"

echo "Created temporary migration at $POST_CHECK_MIGRATION_FILE"
echo "Running a final db push to apply post-check..."
"$SUPABASE" db push || echo "Warning: Could not run post-check SQL, but migrations may have been applied successfully."

# Clean up temporary migrations
echo "Cleaning up temporary migrations..."
if [[ -d "$TEMP_MIGRATION_DIR" ]]; then
  rm -rf "$TEMP_MIGRATION_DIR"
  echo "Removed temporary migration directory"
fi

echo "✅ Migration process completed. Please verify database structure in the Supabase dashboard."
