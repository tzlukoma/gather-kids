-- Migration: Ensure households table has correct snake_case columns for canonical system
-- The canonical DAL expects snake_case columns and handles camelCase translation internally

-- Ensure we have the snake_case preferred_scripture_translation column (canonical standard)
ALTER TABLE households ADD COLUMN IF NOT EXISTS preferred_scripture_translation text;

-- Ensure we have the 'name' column (canonical standard)
ALTER TABLE households ADD COLUMN IF NOT EXISTS name text;
UPDATE households 
SET name = household_name 
WHERE name IS NULL AND household_name IS NOT NULL;

-- Note: The canonical DAL handles camelCase -> snake_case translation internally
-- No need to create camelCase columns in the database
