#!/usr/bin/env bash
# This script safely checks and creates tables in your Supabase database
# It handles the case where tables already exist and has better error handling

set -euo pipefail

PROJECT_ID="${1:-}"
ACCESS_TOKEN="${2:-}"
DB_PASSWORD="${3:-}"

if [[ -z "$PROJECT_ID" || -z "$ACCESS_TOKEN" || -z "$DB_PASSWORD" ]]; then
  echo "Usage: $0 <PROJECT_ID> <ACCESS_TOKEN> <DB_PASSWORD>"
  exit 2
fi

# Function to execute SQL with better error handling
safe_execute_sql() {
  local sql="$1"
  local description="$2"
  local continue_on_error="${3:-false}"
  
  echo "Attempting: $description"
  
  # Create a temporary file with the SQL command
  temp_file=$(mktemp)
  echo "$sql" > "$temp_file"
  
  # Try direct SQL execution with psql (best-effort)
  set +e
  PGPASSWORD="$DB_PASSWORD" psql -h "db.$PROJECT_ID.supabase.co" -U "postgres" -d "postgres" -f "$temp_file" >/dev/null 2>&1
  psql_rc=$?
  set -e
  
  if [[ $psql_rc -eq 0 ]]; then
    echo "✓ Success: $description"
    rm -f "$temp_file"
    return 0
  else
    echo "⚠️ Warning: $description failed with exit code $psql_rc"
    echo "SQL command (for reference):"
    echo "------------------------------------"
    cat "$temp_file"
    echo "------------------------------------"
    rm -f "$temp_file"
    
    if [[ "$continue_on_error" == "true" ]]; then
      echo "Continuing despite error (as requested)"
      return 0
    else
      return 1
    fi
  fi
}

# Function to safely check if a table exists
table_exists() {
  local table_name="$1"
  local result
  
  set +e
  result=$(PGPASSWORD="$DB_PASSWORD" psql -h "db.$PROJECT_ID.supabase.co" -U "postgres" -d "postgres" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table_name')")
  set -e
  
  [[ "$result" == "t" ]]
}

# First ensure pgcrypto extension is available
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
" "Ensuring pgcrypto extension" true

# Check and create households table
if table_exists "households"; then
  echo "✓ households table already exists, skipping creation"
else
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
  " "Creating households table" true
fi

# Check and create guardians table
if table_exists "guardians"; then
  echo "✓ guardians table already exists, skipping creation"
else
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
  " "Creating guardians table" true
fi

# Check and create children table
if table_exists "children"; then
  echo "✓ children table already exists, skipping creation"
else
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
  " "Creating children table" true
fi

# Check and create events table
if table_exists "events"; then
  echo "✓ events table already exists, skipping creation"
else
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
  " "Creating events table" true
fi

# Check and create attendance table
if table_exists "attendance"; then
  echo "✓ attendance table already exists, skipping creation"
else
  safe_execute_sql "
  CREATE TABLE IF NOT EXISTS attendance (
    attendance_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id text REFERENCES events(event_id),
    child_id text REFERENCES children(child_id),
    check_in_time timestamptz,
    check_out_time timestamptz,
    created_at timestamptz DEFAULT now()
  );
  " "Creating attendance table" true
fi

# Check and create ministries table
if table_exists "ministries"; then
  echo "✓ ministries table already exists, skipping creation"
else
  safe_execute_sql "
  CREATE TABLE IF NOT EXISTS ministries (
    ministry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
  );
  " "Creating ministries table" true
fi

# Display summary
echo ""
echo "======= TABLE CHECK SUMMARY ======="
for table in "households" "guardians" "children" "events" "attendance" "ministries"; do
  if table_exists "$table"; then
    echo "✓ $table exists"
  else
    echo "✗ $table does not exist"
  fi
done
echo "=================================="

echo "Table setup process complete (warnings may be normal if tables already exist)"
