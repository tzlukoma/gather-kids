-- Migration: Comprehensive Schema Alignment
-- 
-- This migration ensures all tables have the complete schema expected by the application.
-- It's designed to be idempotent and safe to run multiple times.

BEGIN;

-- ============================================================================
-- HOUSEHOLDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS households (
  household_id text PRIMARY KEY,
  name text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  preferred_scripture_translation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  external_id text
);

-- Add missing columns to existing households table
DO $$
BEGIN
    -- Add name column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'households' AND column_name = 'name' AND table_schema = 'public') THEN
        ALTER TABLE households ADD COLUMN name text;
        RAISE NOTICE 'Added name column to households table';
    END IF;
    
    -- Add preferred_scripture_translation if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'households' AND column_name = 'preferred_scripture_translation' AND table_schema = 'public') THEN
        ALTER TABLE households ADD COLUMN preferred_scripture_translation text;
        RAISE NOTICE 'Added preferred_scripture_translation column to households table';
    END IF;
    
    -- Add external_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'households' AND column_name = 'external_id' AND table_schema = 'public') THEN
        ALTER TABLE households ADD COLUMN external_id text;
        RAISE NOTICE 'Added external_id column to households table';
    END IF;
END $$;

-- ============================================================================
-- CHILDREN TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS children (
  child_id text PRIMARY KEY,
  external_id text,
  household_id text,
  external_household_id text,
  first_name text,
  last_name text,
  birth_date date,
  dob date,
  grade text,
  gender text,
  mobile_phone text,
  child_mobile text,
  allergies text,
  notes text,
  medical_notes text,
  special_needs boolean DEFAULT false,
  special_needs_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns to existing children table
DO $$
BEGIN
    -- Add child_id as primary key if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'child_id' AND table_schema = 'public') THEN
        ALTER TABLE children ADD COLUMN child_id text;
        -- Set as primary key if no primary key exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'children' AND constraint_type = 'PRIMARY KEY' AND table_schema = 'public') THEN
            ALTER TABLE children ADD PRIMARY KEY (child_id);
        END IF;
        RAISE NOTICE 'Added child_id column to children table';
    END IF;
    
    -- Add dob column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'dob' AND table_schema = 'public') THEN
        ALTER TABLE children ADD COLUMN dob date;
        RAISE NOTICE 'Added dob column to children table';
    END IF;
    
    -- Add child_mobile column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'child_mobile' AND table_schema = 'public') THEN
        ALTER TABLE children ADD COLUMN child_mobile text;
        RAISE NOTICE 'Added child_mobile column to children table';
    END IF;
END $$;

-- ============================================================================
-- EMERGENCY_CONTACTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS emergency_contacts (
  contact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(household_id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  mobile_phone text,
  relationship text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- MINISTRIES TABLE (Already handled in previous migration)
-- ============================================================================
-- This is already covered by 20250110000000_ensure_ministries_schema_complete.sql

-- ============================================================================
-- REGISTRATIONS TABLE
-- ============================================================================
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

-- ============================================================================
-- MINISTRY_ENROLLMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ministry_enrollments (
  enrollment_id text PRIMARY KEY,
  child_id text,
  cycle_id text,
  ministry_id text REFERENCES ministries(ministry_id) ON DELETE SET NULL,
  status text,
  custom_fields jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add missing columns to existing ministry_enrollments table
DO $$
BEGIN
    -- Add custom_fields if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ministry_enrollments' AND column_name = 'custom_fields' AND table_schema = 'public') THEN
        ALTER TABLE ministry_enrollments ADD COLUMN custom_fields jsonb;
        RAISE NOTICE 'Added custom_fields column to ministry_enrollments table';
    END IF;
END $$;

-- ============================================================================
-- LEADER_ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS leader_assignments (
  assignment_id text PRIMARY KEY,
  leader_id text,
  ministry_id text,
  cycle_id text,
  role text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- CHILD_YEAR_PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS child_year_profiles (
  profile_id text PRIMARY KEY,
  child_id text,
  cycle_id text,
  grade text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- COMPETITION_YEARS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS competition_years (
  id text PRIMARY KEY,
  year integer,
  name text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- SCRIPTURES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS scriptures (
  scripture_id text PRIMARY KEY,
  competition_year_id text,
  division_id text,
  reference text,
  text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  external_id text
);

-- ============================================================================
-- DIVISIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS divisions (
  id text PRIMARY KEY,
  competition_year_id text,
  name text,
  description text,
  min_age integer,
  max_age integer,
  min_grade integer,
  max_grade integer,
  requires_essay boolean DEFAULT false,
  min_scriptures integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ESSAY_PROMPTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS essay_prompts (
  id text PRIMARY KEY,
  division_id text,
  title text,
  prompt text,
  instructions text,
  min_words integer,
  max_words integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- REGISTRATION_CYCLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS registration_cycles (
  cycle_id text PRIMARY KEY,
  name text,
  description text,
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- LEADER_PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS leader_profiles (
  leader_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  photo_url text,
  avatar_path text,
  notes text,
  background_check_complete boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- MINISTRY_ACCOUNTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ministry_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id text REFERENCES ministries(ministry_id) ON DELETE CASCADE,
  email text,
  display_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ministry_id)
);

-- ============================================================================
-- BRANDING_SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS branding_settings (
  setting_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text,
  logo_url text,
  primary_color text,
  secondary_color text,
  font_family text,
  custom_css text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- GRADE_RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS grade_rules (
  id text PRIMARY KEY,
  competition_year_id text,
  grade text,
  division_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- BIBLE_BEE_ENROLLMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bible_bee_enrollments (
  enrollment_id text PRIMARY KEY,
  child_id text,
  competition_year_id text,
  division_id text,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ENROLLMENT_OVERRIDES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS enrollment_overrides (
  id text PRIMARY KEY,
  child_id text,
  competition_year_id text,
  division_id text,
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

RAISE NOTICE 'Comprehensive schema alignment completed successfully';

COMMIT;
