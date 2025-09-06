-- safe_pgcrypto_extension.sql
-- This script safely creates the pgcrypto extension with error handling
-- to be used in GitHub Actions workflows

DO $$
BEGIN
  -- Check if pgcrypto extension exists in any schema
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pgcrypto'
  ) THEN
    RAISE NOTICE 'pgcrypto extension already exists, skipping creation';
  ELSE
    -- Try to create the extension with proper error handling
    BEGIN
      CREATE EXTENSION pgcrypto;
      RAISE NOTICE 'Successfully created pgcrypto extension';
    EXCEPTION 
      WHEN insufficient_privilege THEN
        RAISE WARNING 'Insufficient privileges to create pgcrypto extension. Action may need elevated permissions.';
      WHEN object_not_in_prerequisite_state THEN  
        RAISE WARNING 'pgcrypto extension is not in a prerequisite state for creation.';
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create pgcrypto extension: %', SQLERRM;
    END;
  END IF;
END
$$;
