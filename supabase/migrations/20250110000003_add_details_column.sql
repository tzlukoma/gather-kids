-- Migration: Add missing details column to ministries table
-- 
-- This migration adds the details column that the production seeding script expects.

BEGIN;

-- Add details column to ministries table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ministries' AND column_name = 'details' AND table_schema = 'public') THEN
        ALTER TABLE ministries ADD COLUMN details text;
        RAISE NOTICE 'Added details column to ministries table';
    ELSE
        RAISE NOTICE 'details column already exists in ministries table';
    END IF;
END $$;

COMMIT;
