-- Migration: Production Clean Schema Setup for Registration Flow
-- This migration creates clean tables for the registration flow only
-- Keeps all other existing tables unchanged

BEGIN;

-- Drop only registration-related tables if they exist (safe for fresh production)
DROP TABLE IF EXISTS emergency_contacts CASCADE;
DROP TABLE IF EXISTS guardians CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS households CASCADE;

-- ============================================================================
-- HOUSEHOLDS TABLE - Clean schema matching canonical DTOs
-- ============================================================================
CREATE TABLE households (
  household_id text PRIMARY KEY,
  name text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  preferred_scripture_translation text,
  primary_email text,
  primary_phone text,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- GUARDIANS TABLE - Clean schema matching canonical DTOs
-- ============================================================================
CREATE TABLE guardians (
  guardian_id text PRIMARY KEY,
  household_id text REFERENCES households(household_id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  mobile_phone text NOT NULL,
  email text,
  relationship text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- CHILDREN TABLE - Clean schema matching canonical DTOs
-- ============================================================================
CREATE TABLE children (
  child_id text PRIMARY KEY,
  household_id text REFERENCES households(household_id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  dob text, -- ISO date string
  grade text,
  child_mobile text,
  allergies text,
  medical_notes text,
  special_needs boolean DEFAULT false,
  special_needs_notes text,
  is_active boolean DEFAULT true,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- EMERGENCY CONTACTS TABLE - Clean schema matching canonical DTOs
-- ============================================================================
CREATE TABLE emergency_contacts (
  contact_id text PRIMARY KEY,
  household_id text REFERENCES households(household_id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  mobile_phone text NOT NULL,
  relationship text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_guardians_household_id ON guardians(household_id);
CREATE INDEX IF NOT EXISTS idx_children_household_id ON children(household_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_household_id ON emergency_contacts(household_id);
CREATE INDEX IF NOT EXISTS idx_guardians_is_primary ON guardians(is_primary);

-- ============================================================================
-- RLS POLICIES (Disabled for MVP)
-- ============================================================================
-- Note: RLS is disabled for MVP as per previous discussions
-- These policies can be enabled later when needed

-- Enable RLS on registration tables only
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for MVP (allows all operations)
CREATE POLICY "Allow all operations on households" ON households FOR ALL USING (true);
CREATE POLICY "Allow all operations on guardians" ON guardians FOR ALL USING (true);
CREATE POLICY "Allow all operations on children" ON children FOR ALL USING (true);
CREATE POLICY "Allow all operations on emergency_contacts" ON emergency_contacts FOR ALL USING (true);

-- ============================================================================
-- LOGGING
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Production clean schema setup completed successfully';
    RAISE NOTICE 'Created registration tables: households, guardians, children, emergency_contacts';
    RAISE NOTICE 'All other existing tables remain unchanged';
    RAISE NOTICE 'Registration tables have RLS enabled with permissive policies for MVP';
    RAISE NOTICE 'Schema matches canonical DTOs exactly';
END $$;

COMMIT;