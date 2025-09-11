-- Migration: Add Bible Bee Cycles table alongside existing Bible Bee Years
-- This adds the new cycle-based system without breaking existing functionality

BEGIN;

-- Create the new bible_bee_cycles table
CREATE TABLE IF NOT EXISTS bible_bee_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id text NOT NULL REFERENCES registration_cycles(cycle_id),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bible_bee_cycles_cycle_id ON bible_bee_cycles(cycle_id);
CREATE INDEX IF NOT EXISTS idx_bible_bee_cycles_active ON bible_bee_cycles(is_active);

-- Add bible_bee_cycle_id columns to existing tables (optional, for future use)
-- These are nullable so existing data continues to work

DO $$
BEGIN
  -- Add to divisions table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'divisions') THEN
    ALTER TABLE divisions ADD COLUMN IF NOT EXISTS bible_bee_cycle_id uuid REFERENCES bible_bee_cycles(id);
  END IF;
  
  -- Add to essay_prompts table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essay_prompts') THEN
    ALTER TABLE essay_prompts ADD COLUMN IF NOT EXISTS bible_bee_cycle_id uuid REFERENCES bible_bee_cycles(id);
  END IF;
  
  -- Add to enrollment_overrides table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollment_overrides') THEN
    ALTER TABLE enrollment_overrides ADD COLUMN IF NOT EXISTS bible_bee_cycle_id uuid REFERENCES bible_bee_cycles(id);
  END IF;
  
  -- Add to scriptures table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scriptures') THEN
    ALTER TABLE scriptures ADD COLUMN IF NOT EXISTS bible_bee_cycle_id uuid REFERENCES bible_bee_cycles(id);
  END IF;
END $$;

COMMIT;
