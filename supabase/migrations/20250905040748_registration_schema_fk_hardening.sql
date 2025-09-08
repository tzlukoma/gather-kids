-- 20250905040748_registration_schema_fk_hardening.sql
-- Registration Fresh Start Step 3.3: FK Hardening (consolidate household references)
-- Ensures all household references use consistent primary key relationships

BEGIN;

-- =====================================
-- 1. GUARDIANS: Consolidate household references to household_id
-- =====================================

DO $$
DECLARE
  mapped_count INTEGER;
  unmapped_count INTEGER;
BEGIN
  -- Map household_id from household_uuid when household_id is NULL
  -- This consolidates the various UUID-based references to use the primary household_id
  UPDATE public.guardians g
     SET household_id = h.household_id
    FROM public.households h
   WHERE g.household_id IS NULL
     AND g.household_uuid IS NOT NULL
     AND h.household_uuid = g.household_uuid;

  GET DIAGNOSTICS mapped_count = ROW_COUNT;

  -- Check for any unmapped guardians that still have NULL household_id
  SELECT COUNT(*) INTO unmapped_count
  FROM public.guardians 
  WHERE household_id IS NULL AND household_uuid IS NOT NULL;

  RAISE NOTICE 'Guardians: Mapped % guardians from household_uuid to household_id', mapped_count;
  
  IF unmapped_count > 0 THEN
    RAISE WARNING 'Found % guardians with household_uuid but no matching household - manual review needed', unmapped_count;
  END IF;
END $$;

-- =====================================
-- 2. CHILDREN: Consolidate household references to household_id  
-- =====================================

DO $$
DECLARE
  mapped_count INTEGER;
  unmapped_count INTEGER;
BEGIN
  -- Map household_id from household_uuid when household_id is NULL
  UPDATE public.children c
     SET household_id = h.household_id
    FROM public.households h
   WHERE c.household_id IS NULL
     AND c.household_uuid IS NOT NULL
     AND h.household_uuid = c.household_uuid;

  GET DIAGNOSTICS mapped_count = ROW_COUNT;

  -- Check for any unmapped children that still have NULL household_id
  SELECT COUNT(*) INTO unmapped_count
  FROM public.children 
  WHERE household_id IS NULL AND household_uuid IS NOT NULL;

  RAISE NOTICE 'Children: Mapped % children from household_uuid to household_id', mapped_count;
  
  IF unmapped_count > 0 THEN
    RAISE WARNING 'Found % children with household_uuid but no matching household - manual review needed', unmapped_count;
  END IF;
END $$;

-- =====================================
-- 3. EMERGENCY_CONTACTS: Ensure proper household_id references
-- =====================================

DO $$
DECLARE
  existing_fk BOOLEAN := FALSE;
BEGIN
  -- Check if FK constraint already exists
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'emergency_contacts_household_id_fkey' 
    AND conrelid = 'emergency_contacts'::regclass
  ) INTO existing_fk;

  IF NOT existing_fk THEN
    -- Verify all emergency_contacts have valid household_id references
    PERFORM 1 FROM emergency_contacts ec
    LEFT JOIN households h ON h.household_id = ec.household_id
    WHERE ec.household_id IS NOT NULL AND h.household_id IS NULL
    LIMIT 1;
    
    IF NOT FOUND THEN
      -- Add FK constraint if all references are valid
      ALTER TABLE public.emergency_contacts
        ADD CONSTRAINT emergency_contacts_household_id_fkey 
        FOREIGN KEY (household_id) REFERENCES households(household_id) ON DELETE CASCADE;
      
      RAISE NOTICE 'Emergency Contacts: Added FK constraint to households';
    ELSE
      RAISE WARNING 'Emergency Contacts: Cannot add FK constraint - invalid household_id references exist';
    END IF;
  ELSE
    RAISE NOTICE 'Emergency Contacts: FK constraint already exists';
  END IF;
END $$;

-- =====================================
-- 4. VALIDATION: Verify FK integrity across all registration tables
-- =====================================

DO $$
DECLARE
  guardian_orphans INTEGER;
  children_orphans INTEGER;
  emergency_orphans INTEGER;
BEGIN
  -- Check for orphaned records (records without valid household references)
  
  SELECT COUNT(*) INTO guardian_orphans
  FROM public.guardians g
  LEFT JOIN public.households h ON h.household_id = g.household_id
  WHERE g.household_id IS NOT NULL AND h.household_id IS NULL;

  SELECT COUNT(*) INTO children_orphans  
  FROM public.children c
  LEFT JOIN public.households h ON h.household_id = c.household_id
  WHERE c.household_id IS NOT NULL AND h.household_id IS NULL;

  SELECT COUNT(*) INTO emergency_orphans
  FROM public.emergency_contacts ec
  LEFT JOIN public.households h ON h.household_id = ec.household_id  
  WHERE ec.household_id IS NOT NULL AND h.household_id IS NULL;

  RAISE NOTICE 'FK Integrity Check:';
  RAISE NOTICE '  - Orphaned guardians: % (should be 0)', guardian_orphans;
  RAISE NOTICE '  - Orphaned children: % (should be 0)', children_orphans;
  RAISE NOTICE '  - Orphaned emergency contacts: % (should be 0)', emergency_orphans;

  -- Raise errors if orphaned records exist
  IF guardian_orphans > 0 THEN
    RAISE EXCEPTION 'FK integrity violation: % guardians reference non-existent households', guardian_orphans;
  END IF;

  IF children_orphans > 0 THEN
    RAISE EXCEPTION 'FK integrity violation: % children reference non-existent households', children_orphans;
  END IF;

  IF emergency_orphans > 0 THEN
    RAISE EXCEPTION 'FK integrity violation: % emergency contacts reference non-existent households', emergency_orphans;
  END IF;
END $$;

COMMIT;