BEGIN;

-- 1) Add new uuid column for guardians.household_id
ALTER TABLE guardians
  ADD COLUMN IF NOT EXISTS household_id_uuid uuid;

-- 2) Populate it by joining guardians.household_id (text external id) -> households.external_id -> households.household_id (uuid)
-- Use text casting to avoid uuid <-> text operator errors
UPDATE guardians g
SET household_id_uuid = h.household_id
FROM households h
WHERE g.household_id::text = h.external_id::text;

-- 3) Verification: fail the migration if unmapped rows remain (prevents adding a broken FK)
DO $$
DECLARE
  unmapped_count integer;
BEGIN
  SELECT count(*) INTO unmapped_count FROM guardians WHERE household_id_uuid IS NULL AND household_id IS NOT NULL;
  IF unmapped_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % guardians rows could not be mapped to households (household_id_uuid IS NULL)', unmapped_count;
  END IF;
END$$;

-- 4) Add the FK constraint referencing households(household_id) if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_guardians_household' 
    AND conrelid = 'guardians'::regclass
  ) THEN
    ALTER TABLE guardians
      ADD CONSTRAINT fk_guardians_household
      FOREIGN KEY (household_id_uuid) REFERENCES households(household_id);
  ELSE
    RAISE NOTICE 'Constraint fk_guardians_household already exists, skipping.';
  END IF;
END
$$;

COMMIT;
