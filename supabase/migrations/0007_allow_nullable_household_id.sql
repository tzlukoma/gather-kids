-- Migration: allow referencing household_id in related tables to be nullable
-- This lets us import rows using external_id without failing NOT NULL constraints
-- Note: Primary key column households.household_id cannot be nullable

-- Only make foreign key columns nullable
ALTER TABLE IF EXISTS guardians ALTER COLUMN household_id DROP NOT NULL;
ALTER TABLE IF EXISTS children ALTER COLUMN household_id DROP NOT NULL;
