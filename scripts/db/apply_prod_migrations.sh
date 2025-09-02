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

echo "Creating any missing base tables first..."
cat << 'EOF' | PGPASSWORD="$DB_PASSWORD" psql "postgres://postgres:$DB_PASSWORD@db.$PROJECT_ID.supabase.co:5432/postgres"
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
EOF

echo "Pushing migrations..."
# Use --include-all to ensure all migrations are considered
# Use --skip-execution to just update the schema migrations table without executing migrations
if $HOME/.bin/supabase db push --dry-run --include-all --yes; then
  echo "Dry run successful. Applying migrations..."
  $HOME/.bin/supabase db push --include-all --yes
else
  echo "Dry run failed. Trying alternative approach..."
  # Try to repair the migration history
  $HOME/.bin/supabase migration repair --status reverted 00000 00001 || true
  
  # Try pulling the remote schema to sync
  $HOME/.bin/supabase db pull || true
  
  # Try pushing again
  $HOME/.bin/supabase db push --include-all --yes
fi

echo "✅ Migrations applied successfully."
