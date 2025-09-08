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
     AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_registrations_cycle_id') THEN
    ALTER TABLE registrations 
    ADD CONSTRAINT fk_registrations_cycle_id 
    FOREIGN KEY (cycle_id) REFERENCES registration_cycles(cycle_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key constraint to ministry_enrollments table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ministry_enrollments') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_ministry_enrollments_cycle_id') THEN
    ALTER TABLE ministry_enrollments 
    ADD CONSTRAINT fk_ministry_enrollments_cycle_id 
    FOREIGN KEY (cycle_id) REFERENCES registration_cycles(cycle_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key constraint to leader_assignments table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leader_assignments') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_leader_assignments_cycle_id') THEN
    ALTER TABLE leader_assignments 
    ADD CONSTRAINT fk_leader_assignments_cycle_id 
    FOREIGN KEY (cycle_id) REFERENCES registration_cycles(cycle_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key constraint to child_year_profiles table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_year_profiles') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_child_year_profiles_cycle_id') THEN
    ALTER TABLE child_year_profiles 
    ADD CONSTRAINT fk_child_year_profiles_cycle_id 
    FOREIGN KEY (cycle_id) REFERENCES registration_cycles(cycle_id) ON DELETE SET NULL;
  END IF;
END $$;
