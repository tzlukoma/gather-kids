-- Add missing columns to leader_assignments table to support MinistryLeaderMembership interface
-- This fixes the column mismatch between the interface and database schema

-- Add the is_active column with default value true
ALTER TABLE leader_assignments 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add the notes column (nullable)
ALTER TABLE leader_assignments 
ADD COLUMN IF NOT EXISTS notes text;

-- Add the updated_at column with default value
ALTER TABLE leader_assignments 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add comments to document the column purposes
COMMENT ON COLUMN leader_assignments.is_active IS 'Indicates whether the leader assignment is currently active';
COMMENT ON COLUMN leader_assignments.notes IS 'Optional notes about the leader assignment';
COMMENT ON COLUMN leader_assignments.updated_at IS 'Timestamp when the assignment was last updated';

-- Update existing records to have is_active = true (since they're existing assignments)
UPDATE leader_assignments 
SET is_active = true 
WHERE is_active IS NULL;

-- Update existing records to have updated_at = created_at (since they're existing assignments)
UPDATE leader_assignments 
SET updated_at = created_at 
WHERE updated_at IS NULL;

