-- Migration: convert id columns to text to accept client-generated string IDs

-- First drop all foreign key constraints
ALTER TABLE IF EXISTS guardians DROP CONSTRAINT IF EXISTS guardians_household_id_fkey;
ALTER TABLE IF EXISTS children DROP CONSTRAINT IF EXISTS children_household_id_fkey;
ALTER TABLE IF EXISTS emergency_contacts DROP CONSTRAINT IF EXISTS fk_emergency_contacts_household;
ALTER TABLE IF EXISTS guardians DROP CONSTRAINT IF EXISTS fk_guardians_household;

-- Drop UUID defaults (if any)
DO $$
BEGIN
    -- Drop defaults only if the column exists and has a default
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guardians' AND column_name='household_id' AND column_default IS NOT NULL) THEN
        ALTER TABLE guardians ALTER COLUMN household_id DROP DEFAULT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='children' AND column_name='household_id' AND column_default IS NOT NULL) THEN
        ALTER TABLE children ALTER COLUMN household_id DROP DEFAULT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guardians' AND column_name='guardian_id' AND column_default IS NOT NULL) THEN
        ALTER TABLE guardians ALTER COLUMN guardian_id DROP DEFAULT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='children' AND column_name='child_id' AND column_default IS NOT NULL) THEN
        ALTER TABLE children ALTER COLUMN child_id DROP DEFAULT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='households' AND column_name='household_id' AND column_default IS NOT NULL) THEN
        ALTER TABLE households ALTER COLUMN household_id DROP DEFAULT;
    END IF;
END$$;

-- Convert primary key columns first
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='households' AND column_name='household_id') THEN
        ALTER TABLE IF EXISTS households ALTER COLUMN household_id TYPE text USING household_id::text;
    END IF;
END$$;

-- Convert foreign key columns next
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guardians' AND column_name='household_id') THEN
        ALTER TABLE IF EXISTS guardians ALTER COLUMN household_id TYPE text USING household_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='children' AND column_name='household_id') THEN
        ALTER TABLE IF EXISTS children ALTER COLUMN household_id TYPE text USING household_id::text;
    END IF;
END$$;

-- Convert other ID columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guardians' AND column_name='guardian_id') THEN
        ALTER TABLE IF EXISTS guardians ALTER COLUMN guardian_id TYPE text USING guardian_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='children' AND column_name='child_id') THEN
        ALTER TABLE IF EXISTS children ALTER COLUMN child_id TYPE text USING child_id::text;
    END IF;
END$$;

-- Remove any default functions tied to UUID generation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guardians' AND column_name='guardian_id' AND column_default IS NOT NULL) THEN
        ALTER TABLE guardians ALTER COLUMN guardian_id DROP DEFAULT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='children' AND column_name='child_id' AND column_default IS NOT NULL) THEN
        ALTER TABLE children ALTER COLUMN child_id DROP DEFAULT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='households' AND column_name='household_id' AND column_default IS NOT NULL) THEN
        ALTER TABLE households ALTER COLUMN household_id DROP DEFAULT;
    END IF;
END$$;

-- Re-create the foreign key constraints
DO $$
BEGIN
    -- Add guardians.household_id foreign key if the column and referenced table exist and the constraint isn't present
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardians' AND column_name = 'household_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'households' AND column_name = 'household_id')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guardians_household_id_fkey')
    THEN
        ALTER TABLE IF EXISTS guardians ADD CONSTRAINT guardians_household_id_fkey
            FOREIGN KEY (household_id) REFERENCES households(household_id);
    END IF;

    -- Add children.household_id foreign key if the column and referenced table exist and the constraint isn't present
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'household_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'households' AND column_name = 'household_id')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'children_household_id_fkey')
    THEN
        ALTER TABLE IF EXISTS children ADD CONSTRAINT children_household_id_fkey
            FOREIGN KEY (household_id) REFERENCES households(household_id);
    END IF;
END$$;
    
-- Handle the emergency_contacts and guardians tables if they exist
DO $$
BEGIN
    -- Handle emergency_contacts table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_contacts') THEN
        -- Handle the emergency_contacts.household_id_uuid column if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'emergency_contacts' AND column_name = 'household_id_uuid') THEN
            -- Convert household_id_uuid to text
            ALTER TABLE emergency_contacts ALTER COLUMN household_id_uuid TYPE text USING household_id_uuid::text;
            
            -- Re-add the constraint if all values are non-null
            ALTER TABLE IF EXISTS emergency_contacts 
            ADD CONSTRAINT fk_emergency_contacts_household 
            FOREIGN KEY (household_id_uuid) REFERENCES households(household_id);
        END IF;
    END IF;
    
    -- Handle guardians table household_id_uuid column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guardians') THEN
        -- Handle the guardians.household_id_uuid column if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'guardians' AND column_name = 'household_id_uuid') THEN
            -- Convert household_id_uuid to text
            ALTER TABLE guardians ALTER COLUMN household_id_uuid TYPE text USING household_id_uuid::text;
            
            -- Re-add the constraint if all values are non-null
            ALTER TABLE IF EXISTS guardians 
            ADD CONSTRAINT fk_guardians_household 
            FOREIGN KEY (household_id_uuid) REFERENCES households(household_id);
        END IF;
    END IF;
END
$$;
