-- Migration: Safe application of squashed schema
-- Applies the schema in 9999_squashed_schema.sql but with safety checks

BEGIN;

-- First, ensure the base tables exist with the right columns and types
-- households table
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

-- guardians table
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

-- children table
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

-- Safely add foreign key constraints
-- Create a function for adding FK constraints safely
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION safe_add_fk(
    p_table_name text,
    p_column_name text,
    p_ref_table text,
    p_ref_column text,
    p_constraint_name text,
    p_on_delete text DEFAULT NULL
  ) RETURNS void AS $func$
  BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = p_table_name
      AND c.conname = p_constraint_name
    ) THEN
      -- Build and execute the constraint creation
      IF p_on_delete IS NOT NULL THEN
        EXECUTE format(
          'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I) ON DELETE %s',
          p_table_name, p_constraint_name, p_column_name, p_ref_table, p_ref_column, p_on_delete
        );
      ELSE
        EXECUTE format(
          'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I)',
          p_table_name, p_constraint_name, p_column_name, p_ref_table, p_ref_column
        );
      END IF;
      
      RAISE NOTICE 'Added FK constraint % to %.%', p_constraint_name, p_table_name, p_column_name;
    ELSE
      RAISE NOTICE 'FK constraint % already exists, skipping', p_constraint_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error adding FK constraint %: %', p_constraint_name, SQLERRM;
  END;
  $func$ LANGUAGE plpgsql;
END$$;

-- Add the foreign key constraints safely
SELECT safe_add_fk('guardians', 'household_id', 'households', 'household_id', 'guardians_household_id_fkey', 'CASCADE');
SELECT safe_add_fk('children', 'household_id', 'households', 'household_id', 'children_household_id_fkey', 'SET NULL');

-- Clean up
DROP FUNCTION IF EXISTS safe_add_fk;

COMMIT;
