-- Migration: Safe version of 0004_ids_to_text.sql
-- This migration applies the same changes as 0004_ids_to_text.sql but with safety checks

BEGIN;

-- First check if the utility functions exist, and create them if not
DO $$
BEGIN
  -- Check if functions exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'safe_drop_constraint'
  ) THEN
    -- Create the safe_drop_constraint function
    CREATE OR REPLACE FUNCTION safe_drop_constraint(
      p_table_name text,
      p_constraint_name text
    ) RETURNS void AS $func$
    BEGIN
      -- Check if the table exists
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = p_table_name
      ) THEN
        -- Check if the constraint exists
        IF EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_namespace n ON n.oid = c.connamespace
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = p_table_name
          AND c.conname = p_constraint_name
        ) THEN
          EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 
            p_table_name, p_constraint_name);
          RAISE NOTICE 'Dropped constraint % from table %', p_constraint_name, p_table_name;
        ELSE
          RAISE NOTICE 'Constraint % does not exist on table %, skipping', 
            p_constraint_name, p_table_name;
        END IF;
      ELSE
        RAISE NOTICE 'Table % does not exist, skipping drop constraint %', 
          p_table_name, p_constraint_name;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping constraint % from table %: %', 
        p_constraint_name, p_table_name, SQLERRM;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;

  -- Add more function checks as needed...
END$$;

-- Safely drop all foreign key constraints
SELECT safe_drop_constraint('guardians', 'guardians_household_id_fkey');
SELECT safe_drop_constraint('children', 'children_household_id_fkey');
SELECT safe_drop_constraint('emergency_contacts', 'fk_emergency_contacts_household');
SELECT safe_drop_constraint('guardians', 'fk_guardians_household');

-- Create a function to safely drop defaults
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION safe_drop_default(tbl text, col text) RETURNS void AS $func$
  BEGIN
      -- Check if the table and column exist
      IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = tbl 
          AND column_name = col
      ) THEN
          EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', tbl, col);
          RAISE NOTICE 'Dropped default for %.%', tbl, col;
      ELSE
          RAISE NOTICE 'Column %.% does not exist, skipping', tbl, col;
      END IF;
  EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping default for %.%: %', tbl, col, SQLERRM;
  END;
  $func$ LANGUAGE plpgsql;
END$$;

-- Safely drop UUID defaults
SELECT safe_drop_default('guardians', 'household_id');
SELECT safe_drop_default('children', 'household_id');
SELECT safe_drop_default('guardians', 'guardian_id');
SELECT safe_drop_default('children', 'child_id');
SELECT safe_drop_default('households', 'household_id');

-- Create a function for safe type conversion
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION safe_type_conversion(
    p_table_name text,
    p_column_name text,
    p_type text,
    p_using_expr text DEFAULT NULL
  ) RETURNS void AS $func$
  BEGIN
    -- Check if the table and column exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = p_table_name 
      AND column_name = p_column_name
    ) THEN
      -- Build and execute the ALTER TYPE command
      IF p_using_expr IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE %s USING %s', 
          p_table_name, p_column_name, p_type, p_using_expr);
      ELSE
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE %s', 
          p_table_name, p_column_name, p_type);
      END IF;
      
      RAISE NOTICE 'Changed type of %.% to %', p_table_name, p_column_name, p_type;
    ELSE
      RAISE NOTICE 'Column %.% does not exist, skipping type change', 
        p_table_name, p_column_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error changing type of %.%: %', p_table_name, p_column_name, SQLERRM;
  END;
  $func$ LANGUAGE plpgsql;
END$$;

-- Safely convert primary key columns first
SELECT safe_type_conversion('households', 'household_id', 'text', 'household_id::text');

-- Safely convert foreign key columns next
SELECT safe_type_conversion('guardians', 'household_id', 'text', 'household_id::text');
SELECT safe_type_conversion('children', 'household_id', 'text', 'household_id::text');

-- Safely convert other ID columns
SELECT safe_type_conversion('guardians', 'guardian_id', 'text', 'guardian_id::text');
SELECT safe_type_conversion('children', 'child_id', 'text', 'child_id::text');

-- Clean up our temporary functions
DROP FUNCTION IF EXISTS safe_drop_constraint;
DROP FUNCTION IF EXISTS safe_drop_default;
DROP FUNCTION IF EXISTS safe_type_conversion;

COMMIT;
