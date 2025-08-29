-- Migration: convert id columns to text to accept client-generated string IDs

-- Drop UUID defaults (if any) and change types to text.
-- Change referencing columns first, then referenced primary keys.

ALTER TABLE IF EXISTS guardians ALTER COLUMN household_id DROP DEFAULT;
ALTER TABLE IF EXISTS children ALTER COLUMN household_id DROP DEFAULT;

ALTER TABLE IF EXISTS guardians ALTER COLUMN household_id TYPE text USING household_id::text;
ALTER TABLE IF EXISTS children ALTER COLUMN household_id TYPE text USING household_id::text;

ALTER TABLE IF EXISTS guardians ALTER COLUMN guardian_id DROP DEFAULT;
ALTER TABLE IF EXISTS children ALTER COLUMN child_id DROP DEFAULT;
ALTER TABLE IF EXISTS households ALTER COLUMN household_id DROP DEFAULT;

ALTER TABLE IF EXISTS guardians ALTER COLUMN guardian_id TYPE text USING guardian_id::text;
ALTER TABLE IF EXISTS children ALTER COLUMN child_id TYPE text USING child_id::text;
ALTER TABLE IF EXISTS households ALTER COLUMN household_id TYPE text USING household_id::text;

-- Remove any default functions tied to UUID generation
ALTER TABLE IF EXISTS guardians ALTER COLUMN guardian_id DROP DEFAULT;
ALTER TABLE IF EXISTS children ALTER COLUMN child_id DROP DEFAULT;
ALTER TABLE IF EXISTS households ALTER COLUMN household_id DROP DEFAULT;
