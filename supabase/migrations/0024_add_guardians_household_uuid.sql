BEGIN;

-- 1) Add new uuid column for guardians.household_id
ALTER TABLE guardians
  ADD COLUMN IF NOT EXISTS household_id_uuid uuid;

-- 2) Populate it by joining guardians.household_id (text external id) -> households.external_id -> households.household_id (uuid)
-- Use text casting to avoid uuid <-> text operator errors
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guardians' AND column_name='household_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='households' AND column_name='external_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='households' AND column_name='household_uuid')
  THEN
    -- populate from households.household_uuid (uuid)
    UPDATE guardians g
    SET household_id_uuid = h.household_uuid
    FROM households h
    WHERE g.household_id::text = h.external_id::text;
  ELSE
    RAISE NOTICE 'Skipping guardians.household_id_uuid population: required columns missing';
  END IF;
END$$;

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
    -- Only add FK if the uuid columns exist and constraint is absent
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guardians' AND column_name='household_id_uuid')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='households' AND column_name='household_uuid')
    THEN
      ALTER TABLE guardians
        ADD CONSTRAINT fk_guardians_household
        FOREIGN KEY (household_id_uuid) REFERENCES households(household_uuid);
    ELSE
      RAISE NOTICE 'Skipping FK creation for guardians.household_id_uuid: required columns missing';
    END IF;
  ELSE
    RAISE NOTICE 'Constraint fk_guardians_household already exists, skipping.';
  END IF;
END
$$;

COMMIT;
