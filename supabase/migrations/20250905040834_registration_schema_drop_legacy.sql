-- 20250905040834_registration_schema_drop_legacy.sql
-- Registration Fresh Start Step 3.4: Drop legacy/duplicate columns
-- DESTRUCTIVE: Only run after backfill is complete and adapter is updated

BEGIN;

-- =====================================
-- SAFETY CHECK: Verify backfill completion before drops
-- =====================================

DO $$
DECLARE
  legacy_consents INTEGER;
  empty_snake_case INTEGER := 0;
  empty_canonical_dob INTEGER := 0;
  empty_canonical_mobile INTEGER := 0;
  has_legacy_household BOOLEAN := FALSE;
  has_birth_date BOOLEAN := FALSE;
  has_mobile_phone BOOLEAN := FALSE;
  legacy_colname TEXT := NULL; -- actual legacy column name (preserve case if quoted)
BEGIN
  -- Check for remaining legacy photoRelease consent types
  SELECT COUNT(*) INTO legacy_consents
  FROM public.registrations r,
       jsonb_array_elements(r.consents) e
  WHERE e->>'type' = 'photoRelease';

  -- Detect presence of legacy household camelCase column
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='households' AND lower(column_name)=lower('preferredScriptureTranslation')
  ) INTO has_legacy_household;

  IF has_legacy_household THEN
    -- Find the actual legacy column name (preserves case if it was created quoted)
    SELECT column_name INTO legacy_colname
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='households' AND lower(column_name)=lower('preferredScriptureTranslation')
    LIMIT 1;

    IF legacy_colname IS NOT NULL THEN
      -- Use dynamic SQL and quote_ident to safely reference the legacy column regardless of its exact casing
      EXECUTE format(
        'SELECT COUNT(*) FROM public.households WHERE preferred_scripture_translation IS NULL AND %s IS NOT NULL',
        quote_ident(legacy_colname)
      ) INTO empty_snake_case;
    ELSE
      empty_snake_case := 0;
    END IF;
  ELSE
    empty_snake_case := 0;
  END IF;

  -- Detect legacy children columns and count if present (use dynamic lookup to preserve quoting)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='children' AND lower(column_name)=lower('birth_date')
  ) INTO has_birth_date;

  IF has_birth_date THEN
    -- find actual column name (preserve case if quoted)
    SELECT column_name INTO legacy_colname
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='children' AND lower(column_name)=lower('birth_date')
    LIMIT 1;

    IF legacy_colname IS NOT NULL THEN
      EXECUTE format(
        'SELECT COUNT(*) FROM public.children WHERE dob IS NULL AND %s IS NOT NULL',
        quote_ident(legacy_colname)
      ) INTO empty_canonical_dob;
    ELSE
      empty_canonical_dob := 0;
    END IF;
  ELSE
    empty_canonical_dob := 0;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='children' AND lower(column_name)=lower('mobile_phone')
  ) INTO has_mobile_phone;

  IF has_mobile_phone THEN
    -- find actual column name for mobile_phone
    SELECT column_name INTO legacy_colname
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='children' AND lower(column_name)=lower('mobile_phone')
    LIMIT 1;

    IF legacy_colname IS NOT NULL THEN
      EXECUTE format(
        'SELECT COUNT(*) FROM public.children WHERE child_mobile IS NULL AND %s IS NOT NULL',
        quote_ident(legacy_colname)
      ) INTO empty_canonical_mobile;
    ELSE
      empty_canonical_mobile := 0;
    END IF;
  ELSE
    empty_canonical_mobile := 0;
  END IF;

  -- Abort if backfill is incomplete
  IF legacy_consents > 0 THEN
    RAISE EXCEPTION 'Cannot drop legacy columns: % registrations still have photoRelease consent types', legacy_consents;
  END IF;

  IF empty_snake_case > 0 THEN
    RAISE EXCEPTION 'Cannot drop preferredScriptureTranslation: % households have data not backfilled to preferred_scripture_translation', empty_snake_case;
  END IF;

  IF empty_canonical_dob > 0 THEN
    RAISE EXCEPTION 'Cannot drop birth_date: % children have data not backfilled to dob', empty_canonical_dob;
  END IF;

  IF empty_canonical_mobile > 0 THEN
    RAISE EXCEPTION 'Cannot drop mobile_phone: % children have data not backfilled to child_mobile', empty_canonical_mobile;
  END IF;

  RAISE NOTICE 'Safety check passed: All legacy data has been backfilled to canonical columns';
END $$;

-- =====================================
-- 1. HOUSEHOLDS: Drop legacy camelCase column
-- =====================================

DO $$
BEGIN
  -- Drop preferredScriptureTranslation (camelCase) - data moved to preferred_scripture_translation
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'households' AND column_name = 'preferredScriptureTranslation'
  ) THEN
    ALTER TABLE public.households DROP COLUMN "preferredScriptureTranslation";
    RAISE NOTICE 'Households: Dropped legacy column preferredScriptureTranslation';
  ELSE
    RAISE NOTICE 'Households: Column preferredScriptureTranslation does not exist';
  END IF;
END $$;

-- =====================================
-- 2. CHILDREN: Drop legacy field names  
-- =====================================

DO $$
BEGIN
  -- Drop birth_date (legacy) - data moved to dob
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE public.children DROP COLUMN birth_date;
    RAISE NOTICE 'Children: Dropped legacy column birth_date';
  ELSE
    RAISE NOTICE 'Children: Column birth_date does not exist';
  END IF;

  -- Drop mobile_phone (legacy) - data moved to child_mobile
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'mobile_phone'
  ) THEN
    ALTER TABLE public.children DROP COLUMN mobile_phone;
    RAISE NOTICE 'Children: Dropped legacy column mobile_phone';
  ELSE
    RAISE NOTICE 'Children: Column mobile_phone does not exist';
  END IF;
END $$;

-- =====================================
-- 3. EVALUATE ADDITIONAL DROPS (with conservative approach)
-- =====================================

-- NOTE: The following columns are NOT dropped in this migration due to 
-- potential ongoing usage. They should be evaluated individually:
--
-- HOUSEHOLDS:
-- - household_name: May be used by some components
-- - household_uuid: Still referenced in some FK relationships
-- - address: Generic address field, may be used
--
-- CHILDREN: 
-- - household_uuid: Still used in FK relationships
-- - external_* fields: May be needed for data import compatibility
-- - notes: May be used in UI components
-- - gender: May be used in registration forms
--
-- GUARDIANS:
-- - household_uuid: Still used in FK relationships  
-- - household_id_uuid: Intermediate field, may be needed
-- - external_* fields: May be needed for data import compatibility

-- =====================================
-- 4. FINAL VALIDATION: Verify canonical schema
-- =====================================

DO $$
DECLARE
  households_canonical BOOLEAN;
  children_canonical BOOLEAN;
  registrations_jsonb BOOLEAN;
BEGIN
  -- Verify households table has canonical fields only
  SELECT NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'households' AND column_name = 'preferredScriptureTranslation'
  ) INTO households_canonical;

  -- Verify children table has canonical fields only
  SELECT NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name IN ('birth_date', 'mobile_phone')
  ) INTO children_canonical;

  -- Verify registrations.consents is jsonb
  SELECT data_type = 'jsonb' INTO registrations_jsonb
  FROM information_schema.columns 
  WHERE table_name = 'registrations' AND column_name = 'consents';

  RAISE NOTICE 'Schema Validation:';
  RAISE NOTICE '  - Households canonical: %', households_canonical;
  RAISE NOTICE '  - Children canonical: %', children_canonical;
  RAISE NOTICE '  - Registrations consents is jsonb: %', registrations_jsonb;

  IF NOT (households_canonical AND children_canonical AND registrations_jsonb) THEN
    RAISE WARNING 'Schema validation failed - some canonical requirements not met';
  ELSE
    RAISE NOTICE 'SUCCESS: Registration domain schema is now fully canonical (snake_case)';
  END IF;
END $$;

COMMIT;