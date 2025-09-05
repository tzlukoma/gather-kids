-- Comprehensive schema alignment fix for registration form compatibility
-- This migration addresses all identified mismatches between frontend form fields and database schema

-- 1. Fix households table field naming mismatches
-- Add 'name' field and migrate data from 'household_name'
ALTER TABLE households ADD COLUMN IF NOT EXISTS name text;
UPDATE households 
SET name = household_name 
WHERE name IS NULL AND household_name IS NOT NULL;

-- Create migration-safe column rename for preferred_scripture_translation
-- Add new column with correct name
ALTER TABLE households ADD COLUMN IF NOT EXISTS "preferredScriptureTranslation" text;
-- Migrate data
UPDATE households 
SET "preferredScriptureTranslation" = preferred_scripture_translation 
WHERE "preferredScriptureTranslation" IS NULL AND preferred_scripture_translation IS NOT NULL;

-- 2. Fix children table critical missing fields and naming mismatches
-- Add missing form fields that are required for registration
ALTER TABLE children 
ADD COLUMN IF NOT EXISTS grade text,
ADD COLUMN IF NOT EXISTS special_needs boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS special_needs_notes text,
ADD COLUMN IF NOT EXISTS medical_notes text;

-- Create migration-safe column renames for children table
-- Add new columns with correct names
ALTER TABLE children ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE children ADD COLUMN IF NOT EXISTS child_mobile text;

-- Migrate data from old columns to new columns
UPDATE children 
SET dob = birth_date 
WHERE dob IS NULL AND birth_date IS NOT NULL;

UPDATE children 
SET child_mobile = mobile_phone 
WHERE child_mobile IS NULL AND mobile_phone IS NOT NULL;

-- 3. Fix emergency_contacts table data type mismatches
-- Create new table with correct schema and migrate data
CREATE TABLE IF NOT EXISTS emergency_contacts_new (
    contact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id uuid REFERENCES households(household_id) ON DELETE CASCADE,
    first_name text,
    last_name text,
    mobile_phone text,
    relationship text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Migrate existing data if the old table exists and has data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_contacts') THEN
        -- Copy data, converting household_id to UUID if possible
        INSERT INTO emergency_contacts_new (contact_id, household_id, first_name, last_name, mobile_phone, relationship, created_at, updated_at)
        SELECT 
            CASE 
                WHEN contact_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                THEN contact_id::uuid 
                ELSE gen_random_uuid() 
            END as contact_id,
            CASE 
                WHEN household_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                THEN household_id::uuid 
                ELSE NULL 
            END as household_id,
            first_name,
            last_name,
            mobile_phone,
            relationship,
            COALESCE(created_at, now()),
            COALESCE(updated_at, now())
        FROM emergency_contacts
        ON CONFLICT (contact_id) DO NOTHING;
        
        -- Drop old table and rename new one
        DROP TABLE emergency_contacts;
    END IF;
END $$;

-- Rename the new table to the correct name
ALTER TABLE emergency_contacts_new RENAME TO emergency_contacts;

-- 4. Fix guardians table missing relationship field
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS relationship text;

-- 5. Update squashed schema documentation
COMMENT ON TABLE households IS 'Household information with frontend-compatible field names';
COMMENT ON COLUMN households.name IS 'Household display name (frontend: name)';
COMMENT ON COLUMN households."preferredScriptureTranslation" IS 'Preferred Bible translation (frontend: preferredScriptureTranslation)';

COMMENT ON TABLE children IS 'Children information with all required form fields';
COMMENT ON COLUMN children.dob IS 'Date of birth (frontend: dob)';
COMMENT ON COLUMN children.child_mobile IS 'Child mobile phone (frontend: child_mobile)';
COMMENT ON COLUMN children.grade IS 'Current grade level';
COMMENT ON COLUMN children.special_needs IS 'Whether child has special needs';
COMMENT ON COLUMN children.special_needs_notes IS 'Details about special needs';
COMMENT ON COLUMN children.medical_notes IS 'Additional medical information';

COMMENT ON TABLE emergency_contacts IS 'Emergency contacts with UUID foreign keys';
COMMENT ON COLUMN emergency_contacts.household_id IS 'Foreign key to households table (UUID)';

COMMENT ON TABLE guardians IS 'Guardian/authorized pickup persons';
COMMENT ON COLUMN guardians.relationship IS 'Relationship to children (e.g., Mother, Father, Guardian)';