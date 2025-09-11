-- 20250905040649_registration_schema_normalize.sql
-- Registration Fresh Start Step 3.1: Add/Normalize columns, types, and defaults
-- Non-destructive migration: Only adds/modifies types and defaults

BEGIN;

-- =====================================
-- 1. HOUSEHOLDS: Normalize timestamps and defaults
-- =====================================

-- Convert timestamp columns to timestamptz with defaults
DO $$
BEGIN
  -- Only modify if columns exist and aren't already timestamptz
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'households' AND column_name = 'created_at' 
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE public.households 
      ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'households' AND column_name = 'updated_at'
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE public.households 
      ALTER COLUMN updated_at TYPE timestamptz USING updated_at::timestamptz;
  END IF;

  -- Set defaults if not already set
  ALTER TABLE public.households 
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();
    
  RAISE NOTICE 'Households: Updated timestamp columns to timestamptz with defaults';
END $$;

-- =====================================
-- 2. CHILDREN: Normalize timestamps and boolean defaults  
-- =====================================

DO $$
BEGIN
  -- Convert timestamp columns to timestamptz with defaults
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'created_at'
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE public.children 
      ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'updated_at'
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE public.children 
      ALTER COLUMN updated_at TYPE timestamptz USING updated_at::timestamptz;
  END IF;

  -- Set defaults
  ALTER TABLE public.children 
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();

  -- Set is_active default to true if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.children 
      ALTER COLUMN is_active SET DEFAULT true;
  END IF;

  RAISE NOTICE 'Children: Updated timestamp columns and is_active default';
END $$;

-- =====================================
-- 3. GUARDIANS: Normalize timestamps
-- =====================================

DO $$
BEGIN
  -- Convert timestamp columns to timestamptz with defaults
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'guardians' AND column_name = 'created_at'
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE public.guardians 
      ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'guardians' AND column_name = 'updated_at'
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE public.guardians 
      ALTER COLUMN updated_at TYPE timestamptz USING updated_at::timestamptz;
  END IF;

  -- Set defaults
  ALTER TABLE public.guardians 
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();

  RAISE NOTICE 'Guardians: Updated timestamp columns to timestamptz with defaults';
END $$;

-- =====================================
-- 4. EMERGENCY_CONTACTS: Normalize timestamps
-- =====================================

DO $$
BEGIN
  -- Convert timestamp columns to timestamptz with defaults
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'emergency_contacts' AND column_name = 'created_at'
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE public.emergency_contacts 
      ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'emergency_contacts' AND column_name = 'updated_at'
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE public.emergency_contacts 
      ALTER COLUMN updated_at TYPE timestamptz USING updated_at::timestamptz;
  END IF;

  -- Set defaults
  ALTER TABLE public.emergency_contacts 
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();

  RAISE NOTICE 'Emergency Contacts: Updated timestamp columns to timestamptz with defaults';
END $$;

-- =====================================
-- 5. REGISTRATIONS: Convert consents to jsonb and normalize timestamps
-- =====================================

DO $$
BEGIN
  -- Convert consents from json to jsonb if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'registrations' AND column_name = 'consents'
    AND data_type = 'json'
  ) THEN
    ALTER TABLE public.registrations 
      ALTER COLUMN consents TYPE jsonb USING consents::jsonb;
    RAISE NOTICE 'Registrations: Converted consents column from json to jsonb';
  END IF;

  -- Convert timestamp columns to timestamptz with defaults
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'registrations' AND column_name = 'created_at'
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE public.registrations 
      ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'registrations' AND column_name = 'submitted_at'
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE public.registrations 
      ALTER COLUMN submitted_at TYPE timestamptz USING submitted_at::timestamptz;
  END IF;

  -- Set defaults for timestamps
  ALTER TABLE public.registrations 
    ALTER COLUMN created_at SET DEFAULT now();

  RAISE NOTICE 'Registrations: Updated consents to jsonb and normalized timestamps';
END $$;

COMMIT;