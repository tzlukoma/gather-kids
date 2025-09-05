-- 20250905040720_registration_schema_backfill.sql  
-- Registration Fresh Start Step 3.2: Backfill data (idempotent)
-- Migrates data from legacy camelCase to canonical snake_case fields

BEGIN;

-- =====================================
-- 1. HOUSEHOLDS: Backfill camelCase -> snake_case
-- =====================================

DO $$
DECLARE
  update_count INTEGER;
BEGIN
  -- Backfill preferred_scripture_translation from preferredScriptureTranslation
  -- Only update where snake_case is NULL but camelCase has a value
  UPDATE public.households
     SET preferred_scripture_translation = preferredScriptureTranslation
   WHERE preferred_scripture_translation IS NULL
     AND preferredScriptureTranslation IS NOT NULL;

  GET DIAGNOSTICS update_count = ROW_COUNT;
  RAISE NOTICE 'Households: Backfilled % rows for preferred_scripture_translation', update_count;
END $$;

-- =====================================
-- 2. CHILDREN: Backfill legacy -> canonical field names
-- =====================================

DO $$
DECLARE
  dob_count INTEGER;
  mobile_count INTEGER;
BEGIN
  -- Backfill dob from birth_date (only when dob is NULL)
  UPDATE public.children
     SET dob = birth_date
   WHERE dob IS NULL
     AND birth_date IS NOT NULL;
     
  GET DIAGNOSTICS dob_count = ROW_COUNT;

  -- Backfill child_mobile from mobile_phone (only when child_mobile is NULL)  
  UPDATE public.children
     SET child_mobile = mobile_phone
   WHERE child_mobile IS NULL
     AND mobile_phone IS NOT NULL;
     
  GET DIAGNOSTICS mobile_count = ROW_COUNT;

  RAISE NOTICE 'Children: Backfilled % rows for dob, % rows for child_mobile', dob_count, mobile_count;
END $$;

-- =====================================
-- 3. REGISTRATIONS: Backfill consent types photoRelease -> photo_release
-- =====================================

DO $$
DECLARE
  consent_count INTEGER;
BEGIN
  -- Update consent objects to use snake_case for photo_release type
  -- Only update registrations that have photoRelease consent types
  UPDATE public.registrations
     SET consents = (
       SELECT jsonb_agg(
         CASE WHEN e->>'type' = 'photoRelease'
              THEN jsonb_set(e, '{type}', '"photo_release"')
              ELSE e
         END
       )
       FROM jsonb_array_elements(consents) AS e
     )
   WHERE EXISTS (
     SELECT 1 FROM jsonb_array_elements(consents) e
     WHERE e->>'type' = 'photoRelease'
   );

  GET DIAGNOSTICS consent_count = ROW_COUNT;
  RAISE NOTICE 'Registrations: Updated % rows to convert photoRelease -> photo_release', consent_count;
END $$;

-- =====================================
-- 4. DATA VALIDATION: Verify backfill results
-- =====================================

DO $$
DECLARE
  households_with_preferred_scripture INTEGER;
  children_with_dob INTEGER;
  children_with_mobile INTEGER;
  registrations_with_legacy_consent INTEGER;
BEGIN
  -- Count successful backfills
  SELECT COUNT(*) INTO households_with_preferred_scripture
  FROM public.households 
  WHERE preferred_scripture_translation IS NOT NULL;

  SELECT COUNT(*) INTO children_with_dob
  FROM public.children 
  WHERE dob IS NOT NULL;
  
  SELECT COUNT(*) INTO children_with_mobile  
  FROM public.children
  WHERE child_mobile IS NOT NULL;

  -- Count any remaining legacy consent types (should be 0)
  SELECT COUNT(*) INTO registrations_with_legacy_consent
  FROM public.registrations r,
       jsonb_array_elements(r.consents) e
  WHERE e->>'type' = 'photoRelease';

  RAISE NOTICE 'Backfill Summary:';
  RAISE NOTICE '  - Households with preferred_scripture_translation: %', households_with_preferred_scripture;
  RAISE NOTICE '  - Children with dob: %', children_with_dob;
  RAISE NOTICE '  - Children with child_mobile: %', children_with_mobile;
  RAISE NOTICE '  - Remaining photoRelease consents (should be 0): %', registrations_with_legacy_consent;

  -- Warn if legacy consent types still exist
  IF registrations_with_legacy_consent > 0 THEN
    RAISE WARNING 'Found % registrations with legacy photoRelease consent types - manual review needed', registrations_with_legacy_consent;
  END IF;
END $$;

COMMIT;