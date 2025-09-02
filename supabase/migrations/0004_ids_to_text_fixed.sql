-- Migration: convert id columns to text to accept client-generated string IDs

-- First drop the foreign key constraints
ALTER TABLE IF EXISTS guardians DROP CONSTRAINT IF EXISTS guardians_household_id_fkey;
ALTER TABLE IF EXISTS children DROP CONSTRAINT IF EXISTS children_household_id_fkey;

-- Then drop UUID defaults (if any)
ALTER TABLE IF EXISTS guardians ALTER COLUMN household_id DROP DEFAULT;
ALTER TABLE IF EXISTS children ALTER COLUMN household_id DROP DEFAULT;
ALTER TABLE IF EXISTS guardians ALTER COLUMN guardian_id DROP DEFAULT;
ALTER TABLE IF EXISTS children ALTER COLUMN child_id DROP DEFAULT;
ALTER TABLE IF EXISTS households ALTER COLUMN household_id DROP DEFAULT;

-- Convert primary key columns first
ALTER TABLE IF EXISTS households ALTER COLUMN household_id TYPE text USING household_id::text;

-- Convert foreign key columns next
ALTER TABLE IF EXISTS guardians ALTER COLUMN household_id TYPE text USING household_id::text;
ALTER TABLE IF EXISTS children ALTER COLUMN household_id TYPE text USING household_id::text;

-- Convert other ID columns
ALTER TABLE IF EXISTS guardians ALTER COLUMN guardian_id TYPE text USING guardian_id::text;
ALTER TABLE IF EXISTS children ALTER COLUMN child_id TYPE text USING child_id::text;

-- Re-create the foreign key constraints
ALTER TABLE IF EXISTS guardians ADD CONSTRAINT guardians_household_id_fkey 
    FOREIGN KEY (household_id) REFERENCES households(household_id);
ALTER TABLE IF EXISTS children ADD CONSTRAINT children_household_id_fkey 
    FOREIGN KEY (household_id) REFERENCES households(household_id);
