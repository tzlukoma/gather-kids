-- Migration: Initial safety migration for fresh databases
-- This migration creates tables and safety functions for fresh databases

-- This migration MUST run first before all others to ensure safety
BEGIN;

-- Create the core tables that other migrations might need
-- households
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

-- guardians
CREATE TABLE IF NOT EXISTS guardians (
  guardian_id text PRIMARY KEY,
  external_id text,
  household_id text,
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
  child_id text PRIMARY KEY,
  external_id text,
  household_id text,
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

COMMIT;
