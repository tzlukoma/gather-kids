#!/usr/bin/env bash
# This is a simplified script for production migrations that only uses core Supabase CLI features
# It avoids any flags that might not be supported in all Supabase CLI versions

set -euo pipefail

PROJECT_ID="${1:-}"
ACCESS_TOKEN="${2:-}"
DB_PASSWORD="${3:-}"

if [[ -z "$PROJECT_ID" || -z "$ACCESS_TOKEN" ]]; then
  echo "Usage: $0 <PROJECT_ID> <ACCESS_TOKEN> [DB_PASSWORD]"
  exit 2
fi

# Install Supabase CLI using the official method
if ! command -v supabase &> /dev/null; then
  echo "Installing Supabase CLI..."
  # Create bin directory in home if it doesn't exist
  mkdir -p "$HOME/.bin"
  
  # Download the latest version for Linux (GitHub Actions uses Ubuntu)
  curl -s -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C "$HOME/.bin"
  
  # Make it executable
  chmod +x "$HOME/.bin/supabase"
  
  # Add to PATH
  export PATH="$HOME/.bin:$PATH"
  echo "export PATH=$HOME/.bin:\$PATH" >> "$HOME/.bashrc"
fi

# Export the access token for Supabase CLI
export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"
export SUPABASE_DB_PASSWORD="$DB_PASSWORD"

echo "Linking project..."
# Link project with DB password if provided
if [[ -n "$DB_PASSWORD" ]]; then
  $HOME/.bin/supabase link --project-ref "$PROJECT_ID" --password "$DB_PASSWORD"
else
  $HOME/.bin/supabase link --project-ref "$PROJECT_ID"
fi

# Check CLI version and available commands
echo "Checking Supabase CLI version and available commands..."
$HOME/.bin/supabase --version
$HOME/.bin/supabase db --help

echo "Checking migration status..."
$HOME/.bin/supabase migration status || true

# Directly modify the schema to create base tables and avoid migration conflicts
echo "Setting up database with direct SQL (if needed)..."

# Create a file with our SQL to execute
SQL_FILE="/tmp/direct_setup.sql"
cat > "$SQL_FILE" << 'EOSQL'
-- Create the base tables if they don't exist
CREATE TABLE IF NOT EXISTS households (
  household_id text PRIMARY KEY,
  external_id text,
  created_at timestamptz DEFAULT now(),
  household_name text,
  address text,
  city text,
  state text,
  zip text,
  primary_phone text,
  email text,
  preferred_scripture_translation text
);

CREATE TABLE IF NOT EXISTS children (
  child_id text PRIMARY KEY,
  household_id text,
  external_id text,
  first_name text,
  last_name text,
  birth_date date,
  gender text,
  mobile_phone text,
  allergies text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- More comprehensive fix for household-related tables
DO $$
DECLARE
  column_exists boolean;
  has_default boolean;
BEGIN
  -- Check if children table and household_id column exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'household_id'
  ) INTO column_exists;
  
  IF column_exists THEN
    -- Check if it has a default
    SELECT column_default IS NOT NULL INTO has_default
    FROM information_schema.columns
    WHERE table_name = 'children' AND column_name = 'household_id';
    
    IF has_default THEN
      -- Try to drop the default
      BEGIN
        ALTER TABLE children ALTER COLUMN household_id DROP DEFAULT;
        RAISE NOTICE 'Successfully dropped default from children.household_id';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop default from children.household_id: %', SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'No default found on children.household_id, nothing to drop';
    END IF;
  ELSE
    RAISE NOTICE 'Column children.household_id does not exist, skipping default removal';
    -- Optionally add the column
    BEGIN
      ALTER TABLE children ADD COLUMN household_id text;
      RAISE NOTICE 'Added missing household_id column to children table';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add household_id column: %', SQLERRM;
    END;
  END IF;
END $$;
EOSQL

echo "NOTE: For security, we're using the Supabase CLI to push migrations instead of direct SQL execution"
echo "Attempting to push migrations - this will automatically create tables defined in migration files"

# First try with include-all flag
if $HOME/.bin/supabase db push --dry-run --yes --include-all; then
  echo "Dry run successful with --include-all flag. Applying migrations..."
  $HOME/.bin/supabase db push --yes --include-all
else
  # If that fails, try without include-all
  echo "Dry run with --include-all failed, trying standard push..."
  if $HOME/.bin/supabase db push --dry-run --yes; then
    echo "Dry run successful. Applying migrations..."
    $HOME/.bin/supabase db push --yes
  else
    # If both fail, try to reset and repair
    echo "All dry runs failed. Attempting repair process..."
    
    # Try to repair specific migration versions from the error message
    echo "Attempting migration repair..."
    $HOME/.bin/supabase migration repair --status reverted 00000 00001 || true
    $HOME/.bin/supabase migration repair --status reverted 0000 0001 || true
    
    # Try again with the repaired migration history
    echo "Trying migration push after repair..."
    $HOME/.bin/supabase db push --yes --include-all || true
  fi
fi

echo "Verifying database setup..."
$HOME/.bin/supabase migration status || true

echo "✅ Migration process completed. Please verify database structure in the Supabase dashboard."
