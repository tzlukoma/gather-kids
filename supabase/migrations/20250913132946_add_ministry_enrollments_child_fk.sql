-- Add foreign key constraint from ministry_enrollments.child_id to children.child_id
-- This fixes the relationship needed for the daily digest script

DO $$
BEGIN
  -- Check if ministry_enrollments table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ministry_enrollments') THEN
    
    -- First, clean up any orphaned records that reference non-existent children
    DELETE FROM ministry_enrollments 
    WHERE child_id IS NOT NULL 
    AND child_id NOT IN (SELECT child_id FROM children);
    
    -- Then add the foreign key constraint only if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_ministry_enrollments_child_id'
    ) THEN
      ALTER TABLE ministry_enrollments 
      ADD CONSTRAINT fk_ministry_enrollments_child_id 
      FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE;
      
      RAISE NOTICE 'Added foreign key constraint fk_ministry_enrollments_child_id';
    ELSE
      RAISE NOTICE 'Foreign key constraint fk_ministry_enrollments_child_id already exists';
    END IF;
    
  ELSE
    RAISE NOTICE 'Table ministry_enrollments does not exist, skipping foreign key addition';
  END IF;
END $$;
