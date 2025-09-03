#!/usr/bin/env bash
# This script does a clean setup for linking and pushing to a Supabase project
# It creates a completely fresh temp directory and avoids any cached state

set -euo pipefail

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <project-ref> <db-password>"
    exit 1
fi

PROJECT_REF="$1"
DB_PASSWORD="$2"

echo "=== FRESH SUPABASE LINK AND PUSH ==="
echo ""

# Create a completely fresh temp directory structure
echo "Step 1: Creating fresh temp directories..."
rm -rf ./supabase/.temp
mkdir -p ./supabase/.temp
echo "Fresh temp directories created."

# Run a full supabase link with password
echo ""
echo "Step 2: Running full link command with password..."
supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"

# Check the project-ref file
echo ""
echo "Step 3: Checking project-ref file..."
if [ -f "./supabase/.temp/project-ref" ]; then
    echo "Project-ref file exists."
    
    # Show raw file content
    echo "File content (hex):"
    xxd -g 1 ./supabase/.temp/project-ref
    
    # Ensure clean content without trailing characters
    echo -n "$PROJECT_REF" > ./supabase/.temp/project-ref
    echo "Cleaned project-ref file content:"
    xxd -g 1 ./supabase/.temp/project-ref
else
    echo "ERROR: project-ref file was not created by the link command!"
    exit 1
fi

# Test a simple migration with pgcrypto
echo ""
echo "Step 4: Creating a test migration for pgcrypto..."
mkdir -p ./supabase/test_migration/migrations
TEST_MIGRATION_FILE="./supabase/test_migration/migrations/$(date +%Y%m%d%H%M%S)_test_pgcrypto.sql"
echo "-- Test migration: CREATE EXTENSION pgcrypto" > "$TEST_MIGRATION_FILE"
echo "CREATE EXTENSION IF NOT EXISTS pgcrypto;" >> "$TEST_MIGRATION_FILE"
echo "Created test migration: $TEST_MIGRATION_FILE"

# Push the test migration
echo ""
echo "Step 5: Pushing the test migration..."
supabase db push --workdir ./supabase/test_migration --include-all --linked

# Try pushing the main migrations
echo ""
echo "Step 6: Pushing the main migrations dry-run..."
supabase db push --workdir ./supabase --dry-run --include-all

echo ""
echo "=== DONE ==="
