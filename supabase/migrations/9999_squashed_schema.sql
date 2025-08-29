-- Squashed schema (automatically generated after import)
-- This file merges the migrations created during iterative import into a single
-- DDL snapshot for easier production onboarding. Review before applying to prod.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- households
CREATE TABLE IF NOT EXISTS households (
  household_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- guardians
CREATE TABLE IF NOT EXISTS guardians (
  guardian_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  household_id uuid REFERENCES households(household_id) ON DELETE CASCADE,
  external_household_id text,
  first_name text,
  last_name text,
  mobile_phone text,
  email text,
  is_primary boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- children
CREATE TABLE IF NOT EXISTS children (
  child_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  household_id uuid REFERENCES households(household_id) ON DELETE SET NULL,
  external_household_id text,
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

-- other tables (lightweight)
CREATE TABLE IF NOT EXISTS emergency_contacts (
  contact_id text PRIMARY KEY,
  household_id text,
  first_name text,
  last_name text,
  mobile_phone text,
  relationship text,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS users (
  user_id text PRIMARY KEY,
  name text,
  email text,
  role text,
  is_active boolean,
  background_check_status text,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS competition_years (
  id text PRIMARY KEY,
  year integer,
  name text,
  description text,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS ministries (
  ministry_id text PRIMARY KEY,
  code text,
  name text,
  description text,
  details text,
  data_profile text,
  enrollment_type text,
  min_age integer,
  max_age integer,
  communicate_later boolean,
  custom_questions jsonb,
  optional_consent_text text,
  is_active boolean,
  open_at date,
  close_at date,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS registrations (
  registration_id text PRIMARY KEY,
  child_id text,
  cycle_id text,
  status text,
  pre_registered_sunday_school boolean,
  consents jsonb,
  submitted_at timestamptz,
  submitted_via text,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS ministry_enrollments (
  enrollment_id text PRIMARY KEY,
  child_id text,
  cycle_id text,
  ministry_id text,
  status text,
  custom_fields jsonb,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS leader_assignments (
  assignment_id text PRIMARY KEY,
  leader_id text,
  ministry_id text,
  cycle_id text,
  role text,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS events (
  event_id text PRIMARY KEY,
  name text,
  description text,
  timeslots jsonb,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS attendance (
  attendance_id text PRIMARY KEY,
  event_id text,
  child_id text,
  date date,
  timeslot_id text,
  check_in_at timestamptz,
  checked_in_by text,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS incidents (
  incident_id text PRIMARY KEY,
  child_id text,
  child_name text,
  event_id text,
  description text,
  severity text,
  leader_id text,
  timestamp timestamptz,
  admin_acknowledged_at timestamptz
);

CREATE TABLE IF NOT EXISTS scriptures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  competition_year_id text,
  "order" integer,
  reference text,
  texts jsonb,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS grade_rules (
  id text PRIMARY KEY,
  competition_year_id text,
  min_grade integer,
  max_grade integer,
  type text,
  target_count integer,
  prompt_text text,
  instructions text,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS student_scriptures (
  id text PRIMARY KEY,
  child_id text,
  competition_year_id text,
  scripture_id text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS student_essays (
  id text PRIMARY KEY,
  child_id text,
  competition_year_id text,
  status text,
  prompt_text text,
  instructions text,
  created_at timestamptz,
  updated_at timestamptz
);
