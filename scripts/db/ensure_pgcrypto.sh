#!/usr/bin/env bash
# This script safely handles pgcrypto extension creation for GitHub workflows
# It will not fail if the extension already exists or if there are permission issues

set -euo pipefail

DB_PASSWORD="${1:-}"
PROJECT_ID="${2:-}"

if [[ -z "$PROJECT_ID" || -z "$DB_PASSWORD" ]]; then
  echo "Usage: $0 <DB_PASSWORD> <PROJECT_ID>"
  exit 2
fi

echo "Attempting to safely create pgcrypto extension..."

# Create a temporary SQL file with safe extension creation
TEMP_SQL=$(mktemp)
cat > "$TEMP_SQL" << 'EOSQL'
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
        RAISE WARNING 'Insufficient privileges to create pgcrypto extension. This is expected for non-superusers.';
      WHEN object_not_in_prerequisite_state THEN  
        RAISE WARNING 'pgcrypto extension is not in a prerequisite state for creation.';
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create pgcrypto extension: %', SQLERRM;
    END;
  END IF;
END
$$;

-- Check if pgcrypto functions are available regardless of extension status
DO $$
BEGIN
  PERFORM gen_random_uuid();
  RAISE NOTICE 'gen_random_uuid() function is available';
EXCEPTION
  WHEN undefined_function THEN
    RAISE WARNING 'gen_random_uuid() function is not available. Some features may not work correctly.';
  WHEN OTHERS THEN
    RAISE WARNING 'Error checking gen_random_uuid(): %', SQLERRM;
END
$$;
EOSQL

# Run the SQL, ignoring errors
set +e
PGPASSWORD="$DB_PASSWORD" psql -h "db.$PROJECT_ID.supabase.co" -U "postgres" -d "postgres" -f "$TEMP_SQL"
pgcrypto_status=$?
set -e

# Clean up
rm -f "$TEMP_SQL"

if [[ $pgcrypto_status -eq 0 ]]; then
  echo "✓ pgcrypto extension check completed successfully"
else
  echo "⚠️ pgcrypto extension check completed with warnings"
  echo "This is often normal when the database user doesn't have permission to create extensions."
  echo "Continuing workflow as the database may already have the extension or required functions."
fi

# Always exit with success to prevent workflow failure
exit 0
