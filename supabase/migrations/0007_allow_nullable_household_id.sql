-- Migration: allow household_id (and referencing household_id) to be nullable
-- This lets us import rows using external_id without failing NOT NULL constraints

ALTER TABLE IF EXISTS households ALTER COLUMN household_id DROP NOT NULL;
ALTER TABLE IF EXISTS guardians ALTER COLUMN household_id DROP NOT NULL;
ALTER TABLE IF EXISTS children ALTER COLUMN household_id DROP NOT NULL;
