-- emergency_contacts_fix.sql
-- This SQL script fixes the emergency_contacts foreign key constraint issues

-- 1. Drop the foreign key constraint
ALTER TABLE emergency_contacts DROP CONSTRAINT IF EXISTS fk_emergency_contacts_household;

-- 2. Update household_id_uuid from external_id where possible
UPDATE emergency_contacts e
SET household_id_uuid = h.household_uuid
FROM households h
WHERE e.household_id = h.external_id
  AND e.household_id IS NOT NULL
  AND (e.household_id_uuid IS NULL OR 
       NOT EXISTS (
         SELECT 1 FROM households h2
         WHERE e.household_id_uuid = h2.household_uuid
       )
  );

-- 3. Set invalid references to NULL
UPDATE emergency_contacts e
SET household_id_uuid = NULL
WHERE household_id_uuid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM households h
    WHERE e.household_id_uuid = h.household_uuid
  );

-- 4. Add the constraint back as deferrable
ALTER TABLE emergency_contacts
ADD CONSTRAINT fk_emergency_contacts_household
FOREIGN KEY (household_id_uuid) REFERENCES households(household_uuid)
DEFERRABLE INITIALLY DEFERRED;
