#!/usr/bin/env bash
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

echo "Checking migration status..."
$HOME/.bin/supabase migration status || true

echo "Creating any missing base tables and fixes using Supabase SQL functions..."

# Create a temporary workdir and add migrations for the base tables and fixes
TEMP_WORKDIR=$(mktemp -d)
mkdir -p "$TEMP_WORKDIR/supabase/migrations"

cat > "$TEMP_WORKDIR/supabase/migrations/$(date +%Y%m%d%H%M%S)_create_base_tables.sql" <<'EOSQL'
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

-- Special fix for the household_id error
DO $$
BEGIN
  -- If the column exists, try to drop its default
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'household_id'
  ) THEN
    -- Try to drop the default
    BEGIN
      ALTER TABLE children ALTER COLUMN household_id DROP DEFAULT;
      RAISE NOTICE 'Successfully dropped default from children.household_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop default from children.household_id: %', SQLERRM;
    END;
  END IF;
END $$;
EOSQL

cat > "$TEMP_WORKDIR/supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_household_column.sql" <<'EOSQL'
-- Direct fix for specific issues
DO $$
DECLARE
  col_exists boolean;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'household_id'
  ) INTO col_exists;
  
  IF col_exists THEN
    -- Try to drop the default constraint
    BEGIN
      ALTER TABLE children ALTER COLUMN household_id DROP DEFAULT;
      RAISE NOTICE 'Successfully dropped default from children.household_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping default: %', SQLERRM;
    END;
  ELSE
    -- If column doesn't exist, add it
    BEGIN
      ALTER TABLE children ADD COLUMN household_id text;
      RAISE NOTICE 'Added missing household_id column';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error adding column: %', SQLERRM;
    END;
  END IF;
END $$;
EOSQL

echo "Applying temporary migrations via supabase db push..."
if $HOME/.bin/supabase db push --workdir "$TEMP_WORKDIR" --include-all --linked; then
  echo "Temporary migrations applied successfully"
else
  echo "Warning: Temporary migration push failed. Continuing with remaining steps."
fi

echo "Pushing migrations..."
# Try three approaches in sequence, continuing if one fails
(
  # First try with --include-all
  if $HOME/.bin/supabase db push --dry-run --include-all --yes; then
    echo "Dry run with --include-all successful. Applying migrations..."
    $HOME/.bin/supabase db push --include-all --yes
  else
    echo "Dry run with --include-all failed. Trying without --include-all..."
    if $HOME/.bin/supabase db push --dry-run --yes; then
      echo "Dry run successful. Applying migrations..."
      $HOME/.bin/supabase db push --yes
    else
      echo "All dry runs failed. Trying migration repair approach..."
      # Try to repair the migration history for specific migrations
      $HOME/.bin/supabase migration repair --status reverted 00000 00001 || true
      
      # Try pulling the remote schema to sync
      $HOME/.bin/supabase db pull || true
      
      # Try pushing again with forcing
      $HOME/.bin/supabase db push --include-all --yes || true
    fi
  fi
)

# Final verification using a dump and grep for table names
echo "Verifying essential tables existence by dumping schema..."
DUMP_FILE=$(mktemp)
$HOME/.bin/supabase db dump -f "$DUMP_FILE" --linked || true

if grep -q "CREATE TABLE .*households" "$DUMP_FILE" || grep -q "table_name.*households" "$DUMP_FILE" ; then
  echo "Found households table in dump"
else
  echo "Could not find households table in dump"
fi

if grep -q "CREATE TABLE .*children" "$DUMP_FILE" || grep -q "table_name.*children" "$DUMP_FILE" ; then
  echo "Found children table in dump"
else
  echo "Could not find children table in dump"
fi

rm -f "$DUMP_FILE"

echo "✅ Migration script finished. Please inspect the logs for potential warnings or failures."
