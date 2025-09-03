-- Fix for migration 0022: Safely update emergency_contacts foreign key
-- This migration safely updates the emergency_contacts.household_id_uuid column
-- by ensuring the foreign key constraint is only added for valid references

-- 1. Drop the foreign key constraint if it exists
ALTER TABLE IF EXISTS emergency_contacts DROP CONSTRAINT IF EXISTS fk_emergency_contacts_household;

-- 2. Identify and fix invalid references
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  -- Check if the columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emergency_contacts' AND column_name='household_id_uuid')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='households' AND column_name='household_uuid')
  THEN
    -- Count invalid references
    SELECT COUNT(*) INTO invalid_count
    FROM emergency_contacts e
    LEFT JOIN households h ON e.household_id_uuid = h.household_uuid
    WHERE e.household_id_uuid IS NOT NULL 
      AND h.household_uuid IS NULL;
    
    RAISE NOTICE 'Found % emergency contacts with invalid household references', invalid_count;
    
    -- Set invalid references to NULL
    UPDATE emergency_contacts e
    SET household_id_uuid = NULL
    WHERE household_id_uuid IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM households h
        WHERE e.household_id_uuid = h.household_uuid
      );
    
    RAISE NOTICE 'Set % invalid references to NULL', invalid_count;
  ELSE
    RAISE NOTICE 'Skipping emergency_contacts FK fix: required columns missing';
  END IF;
END$$;

-- 3. Try to match by external_id for records with NULL household_id_uuid
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emergency_contacts' AND column_name='household_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='households' AND column_name='external_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emergency_contacts' AND column_name='household_id_uuid')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='households' AND column_name='household_uuid')
  THEN
    -- Update emergency_contacts where household_id matches households.external_id
    WITH updated_rows AS (
      UPDATE emergency_contacts e
      SET household_id_uuid = h.household_uuid
      FROM households h
      WHERE e.household_id = h.external_id
        AND e.household_id IS NOT NULL
        AND e.household_id_uuid IS NULL
      RETURNING 1
    )
    SELECT COUNT(*) INTO STRICT "count" FROM updated_rows;
    
    RAISE NOTICE 'Updated % emergency contacts with matching external IDs', "count";
  ELSE
    RAISE NOTICE 'Skipping emergency_contacts matching by external_id: required columns missing';
  END IF;
END$$;

-- 4. Add the constraint back but only for non-null values
ALTER TABLE IF EXISTS emergency_contacts
ADD CONSTRAINT fk_emergency_contacts_household
FOREIGN KEY (household_id_uuid) REFERENCES households(household_uuid)
DEFERRABLE INITIALLY DEFERRED;
