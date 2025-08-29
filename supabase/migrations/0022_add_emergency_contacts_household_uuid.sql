-- 0022_add_emergency_contacts_household_uuid.sql
-- Safe migration: add a UUID surrogate column to emergency_contacts, populate
-- it from households.external_id, and add a FK to households.household_id.
-- This migration is non-destructive: original text column `household_id` is left
-- in place to preserve client external ids.

BEGIN;

-- 1) Add uuid column if missing
ALTER TABLE IF EXISTS emergency_contacts
  ADD COLUMN IF NOT EXISTS household_id_uuid uuid;

-- 2) Populate from households.external_id where available
UPDATE emergency_contacts e
SET household_id_uuid = h.household_id
FROM households h
WHERE e.household_id = h.external_id
  AND (e.household_id IS NOT NULL);

-- 3) Add FK constraint only if it does not already exist and there are no nulls
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_emergency_contacts_household') THEN
    -- Verify there are no nulls first to avoid failing the migration
    PERFORM 1 FROM emergency_contacts WHERE household_id_uuid IS NULL LIMIT 1;
    IF NOT FOUND THEN
      ALTER TABLE emergency_contacts
        ADD CONSTRAINT fk_emergency_contacts_household FOREIGN KEY (household_id_uuid)
          REFERENCES households(household_id);
    ELSE
      RAISE NOTICE 'Skipping FK creation: household_id_uuid contains NULL values.';
    END IF;
  END IF;
END
$$;

COMMIT;
