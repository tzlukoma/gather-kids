-- Migration: Fix household schema consistency for type mapping
-- This migration ensures the households table has consistent column types
-- The type mapping layer will handle field name conversions

BEGIN;

-- First, let's check the current schema
DO $$
DECLARE
    column_record RECORD;
BEGIN
    RAISE NOTICE 'Current households table schema:';
    FOR column_record IN 
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'households' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: % (nullable: %)', 
            column_record.column_name,
            column_record.data_type,
            column_record.is_nullable;
    END LOOP;
END $$;

-- Fix schema inconsistencies
DO $$
BEGIN
    -- Ensure household_id is text (not uuid) - this is critical for type consistency
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' 
        AND column_name = 'household_id' 
        AND data_type = 'uuid'
        AND table_schema = 'public'
    ) THEN
        -- Convert household_id from uuid to text
        ALTER TABLE households ALTER COLUMN household_id TYPE text USING household_id::text;
        RAISE NOTICE 'Converted household_id from uuid to text';
    END IF;
    
    -- Ensure we have the essential columns for type mapping
    -- Add canonical columns if they don't exist (type mapping will use these)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' 
        AND column_name = 'primary_email' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE households ADD COLUMN primary_email text;
        RAISE NOTICE 'Added primary_email column for canonical DTO support';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' 
        AND column_name = 'primary_phone' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE households ADD COLUMN primary_phone text;
        RAISE NOTICE 'Added primary_phone column for canonical DTO support';
    END IF;
    
    -- Ensure we have legacy columns if they don't exist (type mapping fallback)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' 
        AND column_name = 'email' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE households ADD COLUMN email text;
        RAISE NOTICE 'Added email column for legacy schema support';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' 
        AND column_name = 'phone' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE households ADD COLUMN phone text;
        RAISE NOTICE 'Added phone column for legacy schema support';
    END IF;
    
    -- Ensure other essential columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' 
        AND column_name = 'name' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE households ADD COLUMN name text;
        RAISE NOTICE 'Added name column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' 
        AND column_name = 'address_line1' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE households ADD COLUMN address_line1 text;
        RAISE NOTICE 'Added address_line1 column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' 
        AND column_name = 'address_line2' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE households ADD COLUMN address_line2 text;
        RAISE NOTICE 'Added address_line2 column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' 
        AND column_name = 'preferred_scripture_translation' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE households ADD COLUMN preferred_scripture_translation text;
        RAISE NOTICE 'Added preferred_scripture_translation column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' 
        AND column_name = 'updated_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE households ADD COLUMN updated_at timestamptz DEFAULT now();
        RAISE NOTICE 'Added updated_at column';
    END IF;
END $$;

-- Show final schema
DO $$
DECLARE
    column_record RECORD;
BEGIN
    RAISE NOTICE 'Final households table schema:';
    FOR column_record IN 
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'households' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: % (nullable: %)', 
            column_record.column_name,
            column_record.data_type,
            column_record.is_nullable;
    END LOOP;
END $$;

COMMIT;
