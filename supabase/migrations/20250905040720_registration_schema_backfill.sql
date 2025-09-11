-- 20250905040720_registration_schema_backfill.sql  
-- Registration Fresh Start Step 3.2: Backfill data (idempotent)
-- Migrates data from legacy camelCase to canonical snake_case fields

BEGIN;

-- =====================================
-- 1. HOUSEHOLDS: Backfill camelCase -> snake_case
-- =====================================

DO $$
DECLARE
  legacy_col text;
  update_count INTEGER;
BEGIN
  -- Detect legacy camelCase column (case-sensitive names are returned as-is from information_schema)
  SELECT column_name INTO legacy_col
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'households'
     AND lower(column_name) = lower('preferredScriptureTranslation')
   LIMIT 1;

  IF legacy_col IS NOT NULL THEN
    -- Use format with %I to quote identifier correctly
    EXECUTE format(
      'UPDATE public.households SET preferred_scripture_translation = %I WHERE preferred_scripture_translation IS NULL AND %I IS NOT NULL',
      legacy_col, legacy_col
    );
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Households: Backfilled % rows for preferred_scripture_translation', update_count;
  ELSE
    RAISE NOTICE 'Households: legacy camelCase column not found; skipping preferred_scripture_translation backfill';
  END IF;
END $$;

-- =====================================
-- 2. CHILDREN: Backfill legacy -> canonical field names
-- =====================================

DO $$
DECLARE
  dob_count INTEGER := 0;
  mobile_count INTEGER := 0;
  has_birth_date BOOLEAN := FALSE;
  has_mobile_phone BOOLEAN := FALSE;
BEGIN
  -- Check for legacy columns before attempting backfills
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='children' AND column_name='birth_date') INTO has_birth_date;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='children' AND column_name='mobile_phone') INTO has_mobile_phone;

  IF has_birth_date THEN
    UPDATE public.children
       SET dob = birth_date
     WHERE dob IS NULL
       AND birth_date IS NOT NULL;
    GET DIAGNOSTICS dob_count = ROW_COUNT;
  ELSE
    RAISE NOTICE 'Children: legacy column birth_date not found; skipping dob backfill';
  END IF;

  IF has_mobile_phone THEN
    UPDATE public.children
       SET child_mobile = mobile_phone
     WHERE child_mobile IS NULL
       AND mobile_phone IS NOT NULL;
    GET DIAGNOSTICS mobile_count = ROW_COUNT;
  ELSE
    RAISE NOTICE 'Children: legacy column mobile_phone not found; skipping child_mobile backfill';
  END IF;

  RAISE NOTICE 'Children: Backfilled % rows for dob, % rows for child_mobile', dob_count, mobile_count;
END $$;

-- =====================================
-- 3. REGISTRATIONS: Backfill consent types photoRelease -> photo_release
-- =====================================

DO $$
DECLARE
  consent_count INTEGER;
  has_consents_column BOOLEAN := FALSE;
BEGIN
  -- Check if consents column exists before attempting update
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'registrations' 
    AND column_name = 'consents'
  ) INTO has_consents_column;

  IF has_consents_column THEN
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
  ELSE
    RAISE NOTICE 'Registrations: consents column not found; skipping photoRelease -> photo_release conversion';
    consent_count := 0;
  END IF;
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
  has_consents_column BOOLEAN := FALSE;
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

  -- Check if consents column exists before attempting validation
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'registrations' 
    AND column_name = 'consents'
  ) INTO has_consents_column;

  IF has_consents_column THEN
    -- Count any remaining legacy consent types (should be 0)
    SELECT COUNT(*) INTO registrations_with_legacy_consent
    FROM public.registrations r,
         jsonb_array_elements(r.consents) e
    WHERE e->>'type' = 'photoRelease';
  ELSE
    registrations_with_legacy_consent := 0;
  END IF;

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