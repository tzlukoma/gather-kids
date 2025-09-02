#!/usr/bin/env bash
# This script creates a simplified table setup SQL file that contains only the essential tables
# and foreign key relationships. It focuses on the tables that aren't being created properly.

set -euo pipefail

# Create the SQL file
mkdir -p /tmp
SQL_FILE="/tmp/simplified_table_setup.sql"

cat > "$SQL_FILE" << 'EOSQL'
-- Create extension first
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create tables that aren't being created properly

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

-- Now add foreign key constraints if they don't already exist
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
    EXCEPTION WHEN OTHERS THEN
      -- Silently continue if constraint can't be added
      NULL;
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
    EXCEPTION WHEN OTHERS THEN
      -- Silently continue if constraint can't be added
      NULL;
    END;
  END IF;

  -- Simplified foreign keys for attendance
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'attendance_event_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE attendance ADD CONSTRAINT attendance_event_id_fkey
        FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;
EOSQL

echo "Created SQL file at $SQL_FILE"
echo "You can execute this SQL manually in the Supabase dashboard SQL editor"
echo "or use 'psql' to connect directly."
echo ""
echo "SQL Contents:"
echo "=============="
cat "$SQL_FILE"
