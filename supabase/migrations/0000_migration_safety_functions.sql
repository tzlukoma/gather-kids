-- Migration: Create safety functions for all migrations
-- This migration adds utility functions to safely handle non-existent tables and columns
-- These functions will be used by other migrations

BEGIN;

-- Create a function to safely alter columns
CREATE OR REPLACE FUNCTION safe_alter_column(
  p_table_name text,
  p_column_name text, 
  p_alter_command text
) RETURNS void AS $$
BEGIN
  -- Check if the table and column exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name 
    AND column_name = p_column_name
  ) THEN
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I %s', 
      p_table_name, p_column_name, p_alter_command);
    RAISE NOTICE 'Altered column %.%: %', p_table_name, p_column_name, p_alter_command;
  ELSE
    RAISE NOTICE 'Column %.% does not exist, skipping alter command: %', 
      p_table_name, p_column_name, p_alter_command;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error altering column %.%: %', p_table_name, p_column_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create a function to safely add columns
CREATE OR REPLACE FUNCTION safe_add_column(
  p_table_name text,
  p_column_name text,
  p_column_def text
) RETURNS void AS $$
BEGIN
  -- Check if the table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = p_table_name
  ) THEN
    -- Check if the column doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = p_table_name 
      AND column_name = p_column_name
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', 
        p_table_name, p_column_name, p_column_def);
      RAISE NOTICE 'Added column %.%', p_table_name, p_column_name;
    ELSE
      RAISE NOTICE 'Column %.% already exists, skipping', p_table_name, p_column_name;
    END IF;
  ELSE
    RAISE NOTICE 'Table % does not exist, skipping add column %', p_table_name, p_column_name;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error adding column %.%: %', p_table_name, p_column_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create a function to safely drop constraints
CREATE OR REPLACE FUNCTION safe_drop_constraint(
  p_table_name text,
  p_constraint_name text
) RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

-- Safe type conversion with error handling
CREATE OR REPLACE FUNCTION safe_alter_column_type(
  p_table_name text,
  p_column_name text,
  p_type text,
  p_using_expr text DEFAULT NULL
) RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

-- Safe foreign key creation
CREATE OR REPLACE FUNCTION safe_add_foreign_key(
  p_table_name text,
  p_column_name text,
  p_ref_table text,
  p_ref_column text,
  p_constraint_name text,
  p_on_delete text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Check if both tables exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = p_table_name
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = p_ref_table
  ) THEN
    -- Check if both columns exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = p_table_name AND column_name = p_column_name
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = p_ref_table AND column_name = p_ref_column
    ) THEN
      -- Check if the constraint doesn't already exist
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = p_table_name
        AND c.conname = p_constraint_name
      ) THEN
        -- Create the FK with or without ON DELETE clause
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
        
        RAISE NOTICE 'Added foreign key constraint % to %.%', 
          p_constraint_name, p_table_name, p_column_name;
      ELSE
        RAISE NOTICE 'Constraint % already exists on table %, skipping', 
          p_constraint_name, p_table_name;
      END IF;
    ELSE
      RAISE NOTICE 'One or both columns (%.% or %.%) do not exist, skipping FK creation', 
        p_table_name, p_column_name, p_ref_table, p_ref_column;
    END IF;
  ELSE
    RAISE NOTICE 'One or both tables (% or %) do not exist, skipping FK creation', 
      p_table_name, p_ref_table;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error adding FK constraint % to %.%: %', 
    p_constraint_name, p_table_name, p_column_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

COMMIT;
