#!/usr/bin/env bash
# This script directly creates all required tables in your Supabase production database
# Use when migrations aren't creating all expected tables

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

echo "Linking project..."
# Link project with DB password if provided
if [[ -n "$DB_PASSWORD" ]]; then
  "$SUPABASE" link --project-ref "$PROJECT_ID" --password "$DB_PASSWORD"
else
  "$SUPABASE" link --project-ref "$PROJECT_ID"
fi

echo "Creating direct SQL command file..."
SQL_FILE="/tmp/complete_table_setup.sql"
cat > "$SQL_FILE" << 'EOSQL'
-- Create extension first
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core tables
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

CREATE TABLE IF NOT EXISTS guardians (
  guardian_id text PRIMARY KEY,
  household_id text,
  external_id text,
  first_name text,
  last_name text,
  mobile_phone text,
  email text,
  created_at timestamptz DEFAULT now()
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

CREATE TABLE IF NOT EXISTS scriptures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_year_id uuid,
  "order" integer,
  reference text,
  texts jsonb,
  created_at timestamptz DEFAULT now(),
  external_id text
);

-- Events and attendance
CREATE TABLE IF NOT EXISTS events (
  event_id text PRIMARY KEY,
  name text,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timeslots (
  timeslot_id text PRIMARY KEY,
  event_id text,
  start_time time,
  end_time time,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  attendance_id text PRIMARY KEY,
  event_id text,
  child_id text,
  date date,
  timeslot_id text,
  check_in_at timestamptz,
  checked_in_by text,
  created_at timestamptz DEFAULT now()
);

-- Emergency contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
  contact_id text PRIMARY KEY,
  household_id text,
  name text,
  relationship text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- User management
CREATE TABLE IF NOT EXISTS users (
  user_id text PRIMARY KEY,
  email text UNIQUE,
  created_at timestamptz DEFAULT now(),
  first_name text,
  last_name text,
  role text
);

-- Bible bee and ministry enrollments
CREATE TABLE IF NOT EXISTS ministries (
  ministry_id text PRIMARY KEY,
  name text,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ministry_leaders (
  leader_id text PRIMARY KEY,
  ministry_id text,
  user_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ministry_enrollments (
  enrollment_id text PRIMARY KEY,
  ministry_id text,
  child_id text,
  created_at timestamptz DEFAULT now(),
  status text,
  notes text,
  custom_fields jsonb
);

CREATE TABLE IF NOT EXISTS grade_rules (
  rule_id text PRIMARY KEY,
  ministry_id text,
  min_birth_date date,
  max_birth_date date,
  grade_label text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_scriptures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id text,
  scripture_id uuid,
  status text,
  score integer,
  notes text,
  updated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_essays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id text,
  status text,
  score integer,
  notes text,
  updated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add missing references (commented out first to allow creation without dependencies)

-- Add foreign key constraints if they don't already exist
DO $$
BEGIN
  -- guardians -> households
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'guardians_household_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE guardians ADD CONSTRAINT guardians_household_id_fkey
        FOREIGN KEY (household_id) REFERENCES households(household_id) ON DELETE CASCADE;
      RAISE NOTICE 'Added FK constraint: guardians_household_id_fkey';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error adding FK constraint guardians_household_id_fkey: %', SQLERRM;
    END;
  END IF;

  -- children -> households
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'children_household_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE children ADD CONSTRAINT children_household_id_fkey
        FOREIGN KEY (household_id) REFERENCES households(household_id) ON DELETE SET NULL;
      RAISE NOTICE 'Added FK constraint: children_household_id_fkey';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error adding FK constraint children_household_id_fkey: %', SQLERRM;
    END;
  END IF;

  -- Additional FK constraints can be added here following the same pattern
END $$;
EOSQL

echo "Running SQL to create all tables directly..."

# Instead of trying to execute a SQL file directly, we'll split the SQL into smaller commands
# and execute them one by one using direct SQL commands

# Execute each CREATE TABLE statement separately for better reliability
echo "Creating tables..."

# Get Supabase CLI version to adapt our commands
CLI_VERSION=$("$SUPABASE" --version | head -n 1 | awk '{print $3}' || echo "unknown")
echo "Detected Supabase CLI version: $CLI_VERSION"

# Helper function to execute SQL - creates a temporary file for better multi-line SQL handling
execute_sql() {
  local sql="$1"
  local description="$2"
  local temp_file
  
  # Create a temporary file with the SQL command
  temp_file=$(mktemp)
  echo "$sql" > "$temp_file"

  echo "Executing: $description"

  # Create a temporary supabase workdir containing this SQL as a migration
  TEMP_WORKDIR=$(mktemp -d)
  mkdir -p "$TEMP_WORKDIR/supabase/migrations"
  TIMESTAMP=$(date +%Y%m%d%H%M%S)
  MIGRATION_FILE="$TEMP_WORKDIR/supabase/migrations/${TIMESTAMP}_complete_table_setup.sql"
  cp "$temp_file" "$MIGRATION_FILE"

  # Try to apply the migration via supabase db push using the temporary workdir
  if "$SUPABASE" db push --workdir "$TEMP_WORKDIR" --include-all --linked 2>/dev/null; then
    rm "$temp_file"
    rm -rf "$TEMP_WORKDIR"
    echo "✓ $description (applied via db push)"
    return 0
  fi

  # If db push fails, try direct SQL execution with psql (best-effort)
  echo "Trying direct SQL execution for: $description"
  if command -v psql &> /dev/null && [[ -n "$DB_PASSWORD" ]]; then
    PGPASSWORD="$DB_PASSWORD" psql -h "db.$PROJECT_ID.supabase.co" -U "postgres" -d "postgres" -f "$temp_file" 2>/dev/null
    result=$?
    rm "$temp_file"
    rm -rf "$TEMP_WORKDIR"

    if [[ $result -eq 0 ]]; then
      echo "✓ $description (via direct psql)"
      return 0
    fi
  else
    rm "$temp_file"
    rm -rf "$TEMP_WORKDIR"
  fi

  # Last resort: print the SQL command so it can be run manually
  echo "❌ Failed to execute: $description"
  echo "Manual SQL command (for reference):"
  echo "------------------------------------"
  cat "$temp_file"
  echo "------------------------------------"
  rm "$temp_file"
  return 1
}

# Create extension first
execute_sql "CREATE EXTENSION IF NOT EXISTS pgcrypto;" "Created extension pgcrypto"

# Create households table
execute_sql "CREATE TABLE IF NOT EXISTS households (
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
);" "Created households table"

# Create guardians table
execute_sql "CREATE TABLE IF NOT EXISTS guardians (
  guardian_id text PRIMARY KEY,
  household_id text,
  external_id text,
  first_name text,
  last_name text,
  mobile_phone text,
  email text,
  created_at timestamptz DEFAULT now()
);" "Created guardians table"

# Create children table
execute_sql "CREATE TABLE IF NOT EXISTS children (
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
);" "Created children table"

# Create scriptures table
execute_sql "CREATE TABLE IF NOT EXISTS scriptures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_year_id uuid,
  "order" integer,
  reference text,
  texts jsonb,
  created_at timestamptz DEFAULT now(),
  external_id text
);" "Created scriptures table"

# Create events table
execute_sql "CREATE TABLE IF NOT EXISTS events (
  event_id text PRIMARY KEY,
  name text,
  description text,
  created_at timestamptz DEFAULT now()
);" "Created events table"

# Create timeslots table
execute_sql "CREATE TABLE IF NOT EXISTS timeslots (
  timeslot_id text PRIMARY KEY,
  event_id text,
  start_time time,
  end_time time,
  description text,
  created_at timestamptz DEFAULT now()
);" "Created timeslots table"

# Create attendance table
execute_sql "CREATE TABLE IF NOT EXISTS attendance (
  attendance_id text PRIMARY KEY,
  event_id text,
  child_id text,
  date date,
  timeslot_id text,
  check_in_at timestamptz,
  checked_in_by text,
  created_at timestamptz DEFAULT now()
);" "Created attendance table"

# Create emergency_contacts table
execute_sql "CREATE TABLE IF NOT EXISTS emergency_contacts (
  contact_id text PRIMARY KEY,
  household_id text,
  name text,
  relationship text,
  phone text,
  created_at timestamptz DEFAULT now()
);" "Created emergency_contacts table"

# Create users table
execute_sql "CREATE TABLE IF NOT EXISTS users (
  user_id text PRIMARY KEY,
  email text UNIQUE,
  created_at timestamptz DEFAULT now(),
  first_name text,
  last_name text,
  role text
);" "Created users table"

# Create ministries table
execute_sql "CREATE TABLE IF NOT EXISTS ministries (
  ministry_id text PRIMARY KEY,
  name text,
  description text,
  created_at timestamptz DEFAULT now()
);" "Created ministries table"

# Create ministry_leaders table
execute_sql "CREATE TABLE IF NOT EXISTS ministry_leaders (
  leader_id text PRIMARY KEY,
  ministry_id text,
  user_id text,
  created_at timestamptz DEFAULT now()
);" "Created ministry_leaders table"

# Create ministry_enrollments table
execute_sql "CREATE TABLE IF NOT EXISTS ministry_enrollments (
  enrollment_id text PRIMARY KEY,
  ministry_id text,
  child_id text,
  created_at timestamptz DEFAULT now(),
  status text,
  notes text,
  custom_fields jsonb
);" "Created ministry_enrollments table"

# Create grade_rules table
execute_sql "CREATE TABLE IF NOT EXISTS grade_rules (
  rule_id text PRIMARY KEY,
  ministry_id text,
  min_birth_date date,
  max_birth_date date,
  grade_label text,
  created_at timestamptz DEFAULT now()
);" "Created grade_rules table"

# Create student_scriptures table
execute_sql "CREATE TABLE IF NOT EXISTS student_scriptures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id text,
  scripture_id uuid,
  status text,
  score integer,
  notes text,
  updated_at timestamptz,
  created_at timestamptz DEFAULT now()
);" "Created student_scriptures table"

# Create student_essays table
execute_sql "CREATE TABLE IF NOT EXISTS student_essays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id text,
  status text,
  score integer,
  notes text,
  updated_at timestamptz,
  created_at timestamptz DEFAULT now()
);" "Created student_essays table"

# Add foreign key constraints
echo "Adding foreign key constraints..."
execute_sql "DO $$
BEGIN
  -- guardians -> households
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'guardians_household_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE guardians ADD CONSTRAINT guardians_household_id_fkey
        FOREIGN KEY (household_id) REFERENCES households(household_id) ON DELETE CASCADE;
      RAISE NOTICE 'Added FK constraint: guardians_household_id_fkey';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error adding FK constraint guardians_household_id_fkey: %', SQLERRM;
    END;
  END IF;

  -- children -> households
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'children_household_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE children ADD CONSTRAINT children_household_id_fkey
        FOREIGN KEY (household_id) REFERENCES households(household_id) ON DELETE SET NULL;
      RAISE NOTICE 'Added FK constraint: children_household_id_fkey';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error adding FK constraint children_household_id_fkey: %', SQLERRM;
    END;
  END IF;
END $$;" "Added foreign key constraints"

echo "Verifying database setup..."
# Try to check table counts
TABLE_COUNT_SQL="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
execute_sql "$TABLE_COUNT_SQL" "Counted public tables"

# Try to list tables
TABLE_LIST_SQL="SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
execute_sql "$TABLE_LIST_SQL" "Listed all tables"

echo "✅ All tables have been created. Please verify database structure in the Supabase dashboard."
