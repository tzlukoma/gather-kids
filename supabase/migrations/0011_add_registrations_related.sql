-- Migration: add registrations, child_year_profiles, ministries, ministry_enrollments, leader_assignments

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
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS child_year_profiles (
  profile_id text PRIMARY KEY,
  child_id text,
  cycle_id text,
  grade text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ministry_enrollments (
  enrollment_id text PRIMARY KEY,
  child_id text,
  cycle_id text,
  ministry_id text REFERENCES ministries(ministry_id) ON DELETE SET NULL,
  status text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leader_assignments (
  assignment_id text PRIMARY KEY,
  leader_id text,
  ministry_id text,
  cycle_id text,
  role text,
  created_at timestamptz DEFAULT now()
);
