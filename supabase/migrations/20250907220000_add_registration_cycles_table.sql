-- Migration: Add missing registration_cycles table
-- This table was referenced in the codebase but missing from migrations

CREATE TABLE IF NOT EXISTS registration_cycles (
  cycle_id text PRIMARY KEY,
  name text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  description text,
  is_active boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_registration_cycles_active ON registration_cycles(is_active);
CREATE INDEX IF NOT EXISTS idx_registration_cycles_dates ON registration_cycles(start_date, end_date);

-- Add foreign key constraints to existing tables that reference cycle_id
-- Note: These will only be added if the referenced tables exist

-- Add foreign key constraint to registrations table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'registrations') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'cycle_id' AND table_schema = 'public') THEN
    -- First, clean up any orphaned records that reference non-existent cycles
    DELETE FROM registrations 
    WHERE cycle_id IS NOT NULL 
    AND cycle_id NOT IN (SELECT cycle_id FROM registration_cycles);
    
    -- Then add the constraint only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_registrations_cycle_id') THEN
      ALTER TABLE registrations 
      ADD CONSTRAINT fk_registrations_cycle_id 
      FOREIGN KEY (cycle_id) REFERENCES registration_cycles(cycle_id) ON DELETE SET NULL;
    END IF;
  ELSE
    RAISE NOTICE 'Registrations table or cycle_id column not found; skipping foreign key constraint';
  END IF;
END $$;

-- Add foreign key constraint to ministry_enrollments table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ministry_enrollments') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ministry_enrollments' AND column_name = 'cycle_id' AND table_schema = 'public') THEN
    -- First, clean up any orphaned records that reference non-existent cycles
    DELETE FROM ministry_enrollments 
    WHERE cycle_id IS NOT NULL 
    AND cycle_id NOT IN (SELECT cycle_id FROM registration_cycles);
    
    -- Then add the constraint only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_ministry_enrollments_cycle_id') THEN
      ALTER TABLE ministry_enrollments 
      ADD CONSTRAINT fk_ministry_enrollments_cycle_id 
      FOREIGN KEY (cycle_id) REFERENCES registration_cycles(cycle_id) ON DELETE SET NULL;
    END IF;
  ELSE
    RAISE NOTICE 'Ministry_enrollments table or cycle_id column not found; skipping foreign key constraint';
  END IF;
END $$;

-- Add foreign key constraint to leader_assignments table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leader_assignments') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leader_assignments' AND column_name = 'cycle_id' AND table_schema = 'public') THEN
    -- First, clean up any orphaned records that reference non-existent cycles
    DELETE FROM leader_assignments 
    WHERE cycle_id IS NOT NULL 
    AND cycle_id NOT IN (SELECT cycle_id FROM registration_cycles);
    
    -- Then add the constraint only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_leader_assignments_cycle_id') THEN
      ALTER TABLE leader_assignments 
      ADD CONSTRAINT fk_leader_assignments_cycle_id 
      FOREIGN KEY (cycle_id) REFERENCES registration_cycles(cycle_id) ON DELETE SET NULL;
    END IF;
  ELSE
    RAISE NOTICE 'Leader_assignments table or cycle_id column not found; skipping foreign key constraint';
  END IF;
END $$;

-- Add foreign key constraint to child_year_profiles table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_year_profiles') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'child_year_profiles' AND column_name = 'cycle_id' AND table_schema = 'public') THEN
    -- First, clean up any orphaned records that reference non-existent cycles
    DELETE FROM child_year_profiles 
    WHERE cycle_id IS NOT NULL 
    AND cycle_id NOT IN (SELECT cycle_id FROM registration_cycles);
    
    -- Then add the constraint only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_child_year_profiles_cycle_id') THEN
      ALTER TABLE child_year_profiles 
      ADD CONSTRAINT fk_child_year_profiles_cycle_id 
      FOREIGN KEY (cycle_id) REFERENCES registration_cycles(cycle_id) ON DELETE SET NULL;
    END IF;
  ELSE
    RAISE NOTICE 'Child_year_profiles table or cycle_id column not found; skipping foreign key constraint';
  END IF;
END $$;
