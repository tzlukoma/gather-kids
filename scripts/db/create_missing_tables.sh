#!/usr/bin/env bash
# This script creates a SQL file focused on missing tables that weren't properly created

set -euo pipefail

# Create the SQL file
mkdir -p /tmp
SQL_FILE="/tmp/missing_tables_setup.sql"

cat > "$SQL_FILE" << 'EOSQL'
-- Create missing tables that were not properly created in previous attempts

-- Bible Bee related tables
CREATE TABLE IF NOT EXISTS bible_bee_years (
  year_id text PRIMARY KEY,
  year integer NOT NULL,
  name text,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competition_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_id text REFERENCES bible_bee_years(year_id) ON DELETE CASCADE,
  division_id text,
  name text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS divisions (
  division_id text PRIMARY KEY,
  name text,
  description text,
  min_age integer,
  max_age integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS child_year_profiles (
  profile_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id text,
  year_id text,
  division_id text,
  grade text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enrollment_overrides (
  override_id text PRIMARY KEY,
  child_id text,
  year_id text,
  division_id text,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS essay_prompts (
  prompt_id text PRIMARY KEY,
  competition_year_id uuid,
  prompt_text text,
  created_at timestamptz DEFAULT now()
);

-- Branding settings
CREATE TABLE IF NOT EXISTS branding_settings (
  setting_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id text UNIQUE,
  logo_url text,
  primary_color text,
  secondary_color text,
  font_family text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Incident management
CREATE TABLE IF NOT EXISTS incidents (
  incident_id text PRIMARY KEY,
  child_id text,
  reported_by text,
  reported_at timestamptz,
  description text,
  severity text,
  status text DEFAULT 'open',
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Leader assignment
CREATE TABLE IF NOT EXISTS leader_assignments (
  assignment_id text PRIMARY KEY,
  leader_id text,
  ministry_id text,
  role text,
  created_at timestamptz DEFAULT now()
);

-- Registrations
CREATE TABLE IF NOT EXISTS registrations (
  registration_id text PRIMARY KEY,
  household_id text,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  notes text
);

-- Timeslots
CREATE TABLE IF NOT EXISTS timeslots (
  timeslot_id text PRIMARY KEY,
  event_id text,
  start_time time,
  end_time time,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Ministry Leaders
CREATE TABLE IF NOT EXISTS ministry_leaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id text,
  user_id text,
  role text,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints where appropriate (after all tables exist)
-- Using DO block to safely add constraints only if they don't exist
DO $$
BEGIN
  -- competition_years foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'competition_years_division_id_fkey'
  ) THEN
    ALTER TABLE competition_years 
      ADD CONSTRAINT competition_years_division_id_fkey 
      FOREIGN KEY (division_id) REFERENCES divisions(division_id) ON DELETE SET NULL;
  END IF;

  -- child_year_profiles foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'child_year_profiles_child_id_fkey'
  ) THEN
    ALTER TABLE child_year_profiles 
      ADD CONSTRAINT child_year_profiles_child_id_fkey 
      FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'child_year_profiles_year_id_fkey'
  ) THEN
    ALTER TABLE child_year_profiles 
      ADD CONSTRAINT child_year_profiles_year_id_fkey 
      FOREIGN KEY (year_id) REFERENCES bible_bee_years(year_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'child_year_profiles_division_id_fkey'
  ) THEN
    ALTER TABLE child_year_profiles 
      ADD CONSTRAINT child_year_profiles_division_id_fkey 
      FOREIGN KEY (division_id) REFERENCES divisions(division_id) ON DELETE SET NULL;
  END IF;

  -- enrollment_overrides foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enrollment_overrides_child_id_fkey'
  ) THEN
    ALTER TABLE enrollment_overrides 
      ADD CONSTRAINT enrollment_overrides_child_id_fkey 
      FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enrollment_overrides_year_id_fkey'
  ) THEN
    ALTER TABLE enrollment_overrides 
      ADD CONSTRAINT enrollment_overrides_year_id_fkey 
      FOREIGN KEY (year_id) REFERENCES bible_bee_years(year_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enrollment_overrides_division_id_fkey'
  ) THEN
    ALTER TABLE enrollment_overrides 
      ADD CONSTRAINT enrollment_overrides_division_id_fkey 
      FOREIGN KEY (division_id) REFERENCES divisions(division_id) ON DELETE SET NULL;
  END IF;

  -- essay_prompts foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'essay_prompts_competition_year_id_fkey'
  ) THEN
    ALTER TABLE essay_prompts 
      ADD CONSTRAINT essay_prompts_competition_year_id_fkey 
      FOREIGN KEY (competition_year_id) REFERENCES competition_years(id) ON DELETE CASCADE;
  END IF;

  -- branding_settings foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'branding_settings_ministry_id_fkey'
  ) THEN
    ALTER TABLE branding_settings 
      ADD CONSTRAINT branding_settings_ministry_id_fkey 
      FOREIGN KEY (ministry_id) REFERENCES ministries(ministry_id) ON DELETE CASCADE;
  END IF;

  -- incidents foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incidents_child_id_fkey'
  ) THEN
    ALTER TABLE incidents 
      ADD CONSTRAINT incidents_child_id_fkey 
      FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE SET NULL;
  END IF;

  -- leader_assignments foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leader_assignments_leader_id_fkey'
  ) THEN
    ALTER TABLE leader_assignments 
      ADD CONSTRAINT leader_assignments_leader_id_fkey 
      FOREIGN KEY (leader_id) REFERENCES users(user_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leader_assignments_ministry_id_fkey'
  ) THEN
    ALTER TABLE leader_assignments 
      ADD CONSTRAINT leader_assignments_ministry_id_fkey 
      FOREIGN KEY (ministry_id) REFERENCES ministries(ministry_id) ON DELETE CASCADE;
  END IF;

  -- registrations foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'registrations_household_id_fkey'
  ) THEN
    ALTER TABLE registrations 
      ADD CONSTRAINT registrations_household_id_fkey 
      FOREIGN KEY (household_id) REFERENCES households(household_id) ON DELETE CASCADE;
  END IF;

  -- timeslots foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'timeslots_event_id_fkey'
  ) THEN
    ALTER TABLE timeslots 
      ADD CONSTRAINT timeslots_event_id_fkey 
      FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE;
  END IF;
  
  -- ministry_leaders foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ministry_leaders_ministry_id_fkey'
  ) THEN
    ALTER TABLE ministry_leaders
      ADD CONSTRAINT ministry_leaders_ministry_id_fkey
      FOREIGN KEY (ministry_id) REFERENCES ministries(ministry_id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ministry_leaders_user_id_fkey'
  ) THEN
    ALTER TABLE ministry_leaders
      ADD CONSTRAINT ministry_leaders_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
  END IF;

  -- Error handling can be added here if needed
  RAISE NOTICE 'Foreign key constraints added successfully';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error adding foreign key constraints: %', SQLERRM;
END $$;

EOSQL

echo "Created SQL file with missing tables at $SQL_FILE"
echo "This file contains SQL for creating all the missing tables you've mentioned."
echo ""
echo "To execute this SQL, use one of these methods:"
echo "1. Use the GitHub workflow with method 'missing-tables'"
echo "2. Use the GitHub workflow with method 'direct-sql'"
echo "3. Copy the SQL below and paste it into the Supabase SQL Editor:"
echo ""
echo "========== SQL CONTENT START =========="
cat "$SQL_FILE"
echo "========== SQL CONTENT END =========="
