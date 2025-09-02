-- Migration: Add missing tables referenced in the SupabaseAdapter

-- This migration adds tables that are referenced in the codebase but were not found
-- in the existing migration scripts. This ensures all environments have the same
-- database structure.

BEGIN;

-- branding_settings table (for organization branding configuration)
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

-- bible_bee_years table (for Bible Bee competition years)
CREATE TABLE IF NOT EXISTS bible_bee_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT false,
  registration_open_date date,
  registration_close_date date,
  competition_start_date date,
  competition_end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- divisions table (for Bible Bee divisions)
CREATE TABLE IF NOT EXISTS divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bible_bee_year_id uuid REFERENCES bible_bee_years(id),
  name text NOT NULL,
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

-- essay_prompts table (for Bible Bee essay requirements)
CREATE TABLE IF NOT EXISTS essay_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id uuid REFERENCES divisions(id),
  title text NOT NULL,
  prompt text NOT NULL,
  instructions text,
  min_words integer,
  max_words integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- enrollment_overrides table (for manual division placements)
CREATE TABLE IF NOT EXISTS enrollment_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES children(child_id),
  bible_bee_year_id uuid REFERENCES bible_bee_years(id),
  division_id uuid REFERENCES divisions(id),
  reason text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMIT;
