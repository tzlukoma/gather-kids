-- Migration: Ensure ministries table has all required columns
-- 
-- This migration ensures the ministries table has all the columns that the
-- production seeding script expects, including code, close_at, data_profile,
-- enrollment_type, min_age, max_age, etc.

BEGIN;

-- Ensure ministries table exists with all required columns
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
  updated_at timestamptz,
  external_id text,
  allows_checkin boolean DEFAULT true
);

-- Add any missing columns to existing table
DO $$
BEGIN
    -- Add code column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'code'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN code text;
        RAISE NOTICE 'Added code column to ministries table';
    END IF;

    -- Add close_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'close_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN close_at date;
        RAISE NOTICE 'Added close_at column to ministries table';
    END IF;

    -- Add data_profile column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'data_profile'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN data_profile text;
        RAISE NOTICE 'Added data_profile column to ministries table';
    END IF;

    -- Add enrollment_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'enrollment_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN enrollment_type text;
        RAISE NOTICE 'Added enrollment_type column to ministries table';
    END IF;

    -- Add min_age column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'min_age'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN min_age integer;
        RAISE NOTICE 'Added min_age column to ministries table';
    END IF;

    -- Add max_age column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'max_age'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN max_age integer;
        RAISE NOTICE 'Added max_age column to ministries table';
    END IF;

    -- Add communicate_later column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'communicate_later'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN communicate_later boolean;
        RAISE NOTICE 'Added communicate_later column to ministries table';
    END IF;

    -- Add custom_questions column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'custom_questions'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN custom_questions jsonb;
        RAISE NOTICE 'Added custom_questions column to ministries table';
    END IF;

    -- Add optional_consent_text column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'optional_consent_text'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN optional_consent_text text;
        RAISE NOTICE 'Added optional_consent_text column to ministries table';
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'is_active'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN is_active boolean;
        RAISE NOTICE 'Added is_active column to ministries table';
    END IF;

    -- Add open_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'open_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN open_at date;
        RAISE NOTICE 'Added open_at column to ministries table';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'created_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN created_at timestamptz DEFAULT now();
        RAISE NOTICE 'Added created_at column to ministries table';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN updated_at timestamptz DEFAULT now();
        RAISE NOTICE 'Added updated_at column to ministries table';
    END IF;

    -- Add external_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'external_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN external_id text;
        RAISE NOTICE 'Added external_id column to ministries table';
    END IF;

    -- Add allows_checkin column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ministries'
        AND column_name = 'allows_checkin'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE ministries ADD COLUMN allows_checkin boolean DEFAULT true;
        RAISE NOTICE 'Added allows_checkin column to ministries table';
    END IF;

    RAISE NOTICE 'Ministries table schema verification complete';
END $$;

COMMIT;
