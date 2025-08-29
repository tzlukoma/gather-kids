-- Migration: add households, guardians, and children tables
-- Minimal schemas to receive imported Dexie data. Adjust later as needed.

CREATE TABLE IF NOT EXISTS households (
  household_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  household_name text,
  address text,
  city text,
  state text,
  zip text,
  primary_phone text,
  email text
);

CREATE TABLE IF NOT EXISTS guardians (
  guardian_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(household_id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  mobile_phone text,
  email text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS children (
  child_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(household_id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  birth_date date,
  gender text,
  created_at timestamptz DEFAULT now()
);
