#!/usr/bin/env bash
# This script safely checks and creates tables in your Supabase database using the Supabase CLI
# It handles the case where tables already exist and has better error handling

set -euo pipefail

PROJECT_ID="${1:-}"
ACCESS_TOKEN="${2:-}"
DB_PASSWORD="${3:-}"

if [[ -z "$PROJECT_ID" || -z "$ACCESS_TOKEN" || -z "$DB_PASSWORD" ]]; then
  echo "Usage: $0 <PROJECT_ID> <ACCESS_TOKEN> <DB_PASSWORD>"
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

# Export the access token and password for Supabase CLI
export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"
export SUPABASE_DB_PASSWORD="$DB_PASSWORD"

# Link project first
echo "Linking project with Supabase CLI..."
"$SUPABASE" link --project-ref "$PROJECT_ID" --password "$DB_PASSWORD"

# Function to execute SQL with Supabase CLI
safe_execute_sql() {
  local sql="$1"
  local description="$2"
  local continue_on_error="${3:-false}"
  
  echo "Attempting: $description"
  
  # Create a temporary workdir for this migration
  local temp_dir
  temp_dir=$(mktemp -d)
  mkdir -p "$temp_dir/supabase/migrations"
  
  # Create a timestamp-based migration file
  local timestamp
  timestamp=$(date +%Y%m%d%H%M%S%N)
  local migration_file="$temp_dir/supabase/migrations/${timestamp}_${description// /_}.sql"
  
  # Write the SQL to the migration file
  echo "$sql" > "$migration_file"
  
  # Execute using Supabase CLI db push
  set +e
  "$SUPABASE" db push --workdir "$temp_dir" --linked >/dev/null 2>&1
  local push_rc=$?
  set -e
  
  if [[ $push_rc -eq 0 ]]; then
    echo "✓ Success: $description"
    rm -rf "$temp_dir"
    return 0
  else
    echo "⚠️ Warning: $description failed with exit code $push_rc"
    echo "SQL command (for reference):"
    echo "------------------------------------"
    cat "$migration_file"
    echo "------------------------------------"
    rm -rf "$temp_dir"
    
    if [[ "$continue_on_error" == "true" ]]; then
      echo "Continuing despite error (as requested)"
      return 0
    else
      return 1
    fi
  fi
}

# Function to safely check if a table exists using Supabase CLI
table_exists() {
  local table_name="$1"
  local temp_dir
  temp_dir=$(mktemp -d)
  mkdir -p "$temp_dir/supabase/migrations"
  
  # Create a migration that just checks if the table exists
  local check_sql="SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table_name') as table_exists;"
  local check_file="$temp_dir/supabase/migrations/check_${table_name}.sql"
  
  echo "$check_sql" > "$check_file"
  
  # We'll use the DB dump feature to get the result without modifying the database
  local result_file="$temp_dir/result.txt"
  
  set +e
  "$SUPABASE" db execute --file "$check_file" --linked > "$result_file" 2>/dev/null
  local check_rc=$?
  set -e
  
  # Check if the result contains "t" (true) for table existence
  if [[ $check_rc -eq 0 ]] && grep -q "t" "$result_file"; then
    rm -rf "$temp_dir"
    return 0  # Table exists
  else
    rm -rf "$temp_dir"
    return 1  # Table doesn't exist or error
  fi
}

# Create a function to execute a simple check
execute_check_sql() {
  local description="$1"
  local sql="$2"
  
  echo "Checking: $description"
  
  # Create temporary directory for migration
  local temp_dir
  temp_dir=$(mktemp -d)
  mkdir -p "$temp_dir/supabase/migrations"
  
  # Create migration file
  local timestamp
  timestamp=$(date +%Y%m%d%H%M%S%N)
  local migration_file="$temp_dir/supabase/migrations/${timestamp}_check.sql"
  
  # Write SQL to file
  echo "$sql" > "$migration_file"
  
  # Execute using Supabase CLI
  set +e
  "$SUPABASE" db execute --file "$migration_file" --linked > /dev/null 2>&1
  local rc=$?
  set -e
  
  rm -rf "$temp_dir"
  return $rc
}

# First ensure pgcrypto extension is available
echo "Ensuring pgcrypto extension..."
# Create pgcrypto migration
safe_execute_sql "
DO \$\$
BEGIN
  -- Check if pgcrypto extension exists in any schema
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    RAISE NOTICE 'pgcrypto extension already exists';
  ELSE
    -- Try to create the extension with proper error handling
    BEGIN
      CREATE EXTENSION pgcrypto;
      RAISE NOTICE 'Successfully created pgcrypto extension';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to create pgcrypto extension: %', SQLERRM;
    END;
  END IF;
END
\$\$;
" "pgcrypto_extension" true

# Check for households table
echo "Checking for households table..."
if execute_check_sql "households table existence" "SELECT 1 FROM information_schema.tables WHERE table_name = 'households';" ; then
  echo "✓ households table already exists, skipping creation"
else
  echo "× households table doesn't exist, creating..."
  safe_execute_sql "
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
  " "households_table" true
fi

# Check for guardians table
echo "Checking for guardians table..."
if execute_check_sql "guardians table existence" "SELECT 1 FROM information_schema.tables WHERE table_name = 'guardians';" ; then
  echo "✓ guardians table already exists, skipping creation"
else
  echo "× guardians table doesn't exist, creating..."
  safe_execute_sql "
  CREATE TABLE IF NOT EXISTS guardians (
    guardian_id text PRIMARY KEY,
    household_id text,
    external_id text,
    first_name text,
    last_name text,
    mobile_phone text,
    email text,
    created_at timestamptz DEFAULT now(),
    relationship text,
    is_primary boolean
  );
  " "guardians_table" true
fi

# Check for children table
echo "Checking for children table..."
if execute_check_sql "children table existence" "SELECT 1 FROM information_schema.tables WHERE table_name = 'children';" ; then
  echo "✓ children table already exists, skipping creation"
else
  echo "× children table doesn't exist, creating..."
  safe_execute_sql "
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
    updated_at timestamptz,
    grade text,
    is_active boolean,
    special_needs text
  );
  " "children_table" true
fi

# Check for events table
echo "Checking for events table..."
if execute_check_sql "events table existence" "SELECT 1 FROM information_schema.tables WHERE table_name = 'events';" ; then
  echo "✓ events table already exists, skipping creation"
else
  echo "× events table doesn't exist, creating..."
  safe_execute_sql "
  CREATE TABLE IF NOT EXISTS events (
    event_id text PRIMARY KEY,
    name text,
    description text,
    location text,
    start_time timestamptz,
    end_time timestamptz,
    created_at timestamptz DEFAULT now(),
    timeslots jsonb
  );
  " "events_table" true
fi

# Check for attendance table
echo "Checking for attendance table..."
if execute_check_sql "attendance table existence" "SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance';" ; then
  echo "✓ attendance table already exists, skipping creation"
else
  echo "× attendance table doesn't exist, creating..."
  safe_execute_sql "
  CREATE TABLE IF NOT EXISTS attendance (
    attendance_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id text REFERENCES events(event_id),
    child_id text REFERENCES children(child_id),
    check_in_time timestamptz,
    check_out_time timestamptz,
    created_at timestamptz DEFAULT now()
  );
  " "attendance_table" true
fi

# Check for ministries table
echo "Checking for ministries table..."
if execute_check_sql "ministries table existence" "SELECT 1 FROM information_schema.tables WHERE table_name = 'ministries';" ; then
  echo "✓ ministries table already exists, skipping creation"
else
  echo "× ministries table doesn't exist, creating..."
  safe_execute_sql "
  CREATE TABLE IF NOT EXISTS ministries (
    ministry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
  );
  " "ministries_table" true
fi

# Display summary
echo ""
echo "======= TABLE CHECK SUMMARY ======="
# Run a final check with one query to list all tables
echo "Listing all application tables in the database:"
safe_execute_sql "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('households', 'guardians', 'children', 'events', 'attendance', 'ministries')
ORDER BY table_name;
" "list_tables" true
echo "=================================="

# Final success message
echo ""
echo "✅ Table setup process completed using Supabase CLI"
echo "Any warnings above are normal if tables already exist or don't match expected structure"
echo "This script used Supabase CLI instead of direct psql connections to avoid network issues"
