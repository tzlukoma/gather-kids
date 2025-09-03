#!/usr/bin/env bash
# This script helps debug why Supabase CLI commands might be failing

set -euo pipefail

echo "=== SUPABASE CLI DEBUG SCRIPT ==="
echo ""

# Check CLI version
echo "1. Checking Supabase CLI version..."
supabase_version=$(supabase --version)
echo "   ✓ Supabase CLI version: $supabase_version"

# Check if project linked
echo ""
echo "2. Checking if project is linked..."
if [ -f "./supabase/.temp/project-ref" ]; then
    project_ref=$(cat ./supabase/.temp/project-ref)
    echo "   ✓ Project is linked to ref: $project_ref"
else
    echo "   ✗ Project is NOT linked. Missing supabase/.temp/project-ref"
    echo "     You need to run: supabase link --project-ref <project-id>"
fi

# Check environment variables
echo ""
echo "3. Checking environment variables..."
echo "   SUPABASE_CLI_PATH: ${SUPABASE_CLI_PATH:-not set (will use 'supabase' from PATH)}"
echo "   SUPABASE_ACCESS_TOKEN: ${SUPABASE_ACCESS_TOKEN:+set (value hidden)}"
echo "   SUPABASE_DB_PASSWORD: ${SUPABASE_DB_PASSWORD:+set (value hidden)}"
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
    echo "   ✗ SUPABASE_ACCESS_TOKEN is not set. This is needed for the CLI."
fi
if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
    echo "   ✗ SUPABASE_DB_PASSWORD is not set. This is needed for DB operations."
fi

# Check migrations directory
echo ""
echo "4. Checking migrations directory..."
if [ -d "./supabase/migrations" ]; then
    migration_count=$(find ./supabase/migrations -name "*.sql" | wc -l | tr -d ' ')
    echo "   ✓ Found $migration_count migration files"
    echo "   First few migrations:"
    find ./supabase/migrations -name "*.sql" | sort | head -n 5
else
    echo "   ✗ No migrations directory found at ./supabase/migrations"
fi

# Test CREATE EXTENSION in isolation
echo ""
echo "5. Creating a test migration for pgcrypto extension..."
mkdir -p ./supabase/test-migrations/migrations
test_migration="./supabase/test-migrations/migrations/$(date +%Y%m%d%H%M%S)_test_pgcrypto.sql"
cat > "$test_migration" << EOL
-- Test migration to create pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;
EOL
echo "   ✓ Created test migration: $test_migration"

echo ""
echo "6. Running dry-run push with test migration..."
set +e
supabase db push --workdir ./supabase/test-migrations --dry-run --include-all --debug
push_rc=$?
set -e
if [ $push_rc -eq 0 ]; then
    echo "   ✓ Dry-run push succeeded"
else
    echo "   ✗ Dry-run push failed with exit code $push_rc"
fi

echo ""
echo "=== DEBUGGING STEPS ==="
echo ""
echo "If the script identified issues, here's how to fix them:"
echo ""
echo "1. To link your project:"
echo "   supabase link --project-ref <your-project-id> --password <your-db-password>"
echo ""
echo "2. Set required environment variables:"
echo "   export SUPABASE_ACCESS_TOKEN=\"your_access_token\""
echo "   export SUPABASE_DB_PASSWORD=\"your_db_password\""
echo ""
echo "3. Try running the push operation with debug output:"
echo "   supabase db push --workdir ./supabase --include-all --linked --debug"
echo ""

# Cleanup
rm -rf ./supabase/test-migrations
