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

# Install Supabase CLI using the official method
if ! command -v supabase &> /dev/null; then
  echo "Installing Supabase CLI..."
  mkdir -p "$HOME/.bin"
  curl -s -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C "$HOME/.bin"
  chmod +x "$HOME/.bin/supabase"
  export PATH="$HOME/.bin:$PATH"
  echo "export PATH=$HOME/.bin:\$PATH" >> "$HOME/.bashrc"
fi

# Export the access token for Supabase CLI
export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"
export SUPABASE_DB_PASSWORD="$DB_PASSWORD"

echo "Linking project..."
if [[ -n "$DB_PASSWORD" ]]; then
  $HOME/.bin/supabase link --project-ref "$PROJECT_ID" --password "$DB_PASSWORD"
else
  $HOME/.bin/supabase link --project-ref "$PROJECT_ID"
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

echo "NOTE: For security, we're using the Supabase CLI to execute SQL via db.sql query"
echo "Running SQL file to create all tables directly..."

# Use the appropriate command to execute the SQL script based on CLI version
if $HOME/.bin/supabase db query -f "$SQL_FILE" --linked 2>/dev/null; then
  echo "Successfully executed SQL file using 'supabase db query -f' command."
elif $HOME/.bin/supabase db execute --file "$SQL_FILE" --linked 2>/dev/null; then
  echo "Successfully executed SQL file using 'supabase db execute --file' command."
else
  # Fallback to another approach if the CLI doesn't support direct file execution
  echo "Using fallback method for SQL execution..."
  
  # Try using pg_dump and psql if available
  if command -v psql &> /dev/null; then
    # Get connection string from supabase CLI
    CONNECTION_STRING=$($HOME/.bin/supabase db connection-string | grep "^postgres" || echo "")
    
    if [[ -n "$CONNECTION_STRING" ]]; then
      echo "Executing SQL file using psql..."
      psql "$CONNECTION_STRING" -f "$SQL_FILE"
    else
      echo "Failed to get connection string from Supabase CLI"
      exit 1
    fi
  else
    echo "Unable to find a method to execute SQL. Please check your Supabase CLI installation."
    exit 1
  fi
fi

echo "Verifying database setup..."
$HOME/.bin/supabase migration status || true

echo "✅ All tables have been created. Please verify database structure in the Supabase dashboard."
