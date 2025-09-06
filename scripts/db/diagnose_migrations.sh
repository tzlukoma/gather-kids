#!/usr/bin/env bash
# This script helps diagnose issues with migrations by checking the database schema

set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <connection-string>"
    exit 1
fi

DB_URL="$1"

echo "=== SUPABASE MIGRATION DIAGNOSTICS ==="
echo ""

# Check for psql
if ! command -v psql &> /dev/null; then
    echo "ERROR: psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Test connection
echo "Step 1: Testing database connection..."
if psql "$DB_URL" -c "SELECT 1" &> /dev/null; then
    echo "Database connection successful."
else
    echo "ERROR: Could not connect to the database!"
    exit 1
fi

# Check table existence
echo ""
echo "Step 2: Checking tables mentioned in migrations..."
TABLES=(
    "profiles"
    "check_ins"
    "check_outs"
    "children"
    "families"
    "guardians"
    "leaders"
    "permissions"
    "audit_logs"
    "congregations"
    "auth_user"
)

for TABLE in "${TABLES[@]}"; do
    if psql "$DB_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$TABLE')" | grep -q "t"; then
        echo "✓ Table $TABLE exists"
        
        # Check if id column exists and its type
        ID_TYPE=$(psql "$DB_URL" -t -c "SELECT data_type FROM information_schema.columns WHERE table_name = '$TABLE' AND column_name = 'id'" | xargs)
        if [ -n "$ID_TYPE" ]; then
            echo "  ├─ id column type: $ID_TYPE"
            
            # If there are records, show example IDs
            RECORD_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM $TABLE" | xargs)
            echo "  ├─ record count: $RECORD_COUNT"
            
            if [ "$RECORD_COUNT" -gt 0 ]; then
                EXAMPLE_IDS=$(psql "$DB_URL" -t -c "SELECT id FROM $TABLE LIMIT 3" | xargs)
                echo "  └─ example ids: $EXAMPLE_IDS"
            fi
        else
            echo "  └─ No id column found!"
        fi
    else
        echo "✗ Table $TABLE does not exist"
    fi
done

# Check foreign keys
echo ""
echo "Step 3: Checking foreign key constraints..."
psql "$DB_URL" -c "
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu 
      ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY';
"

# Check migrations table
echo ""
echo "Step 4: Checking migrations status..."
# Check for migration-related tables and advise on Supabase CLI commands
if psql "$DB_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'migrations' OR table_name LIKE '%migration%')" | grep -q "t"; then
    echo "Found migration-related tables (listing matching table names):"
    psql "$DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name='migrations' OR table_name LIKE '%migration%') ORDER BY table_name;"
    echo "If you use Supabase CLI, run: 'supabase migration status' or 'supabase migration up' to inspect/apply migrations."
else
    echo "No standard migration table found. This may be a fresh database or migrations are managed externally (raw SQL in supabase/migrations/)."
    echo "Run 'supabase migration up' or the repo helper script to apply migrations."
fi

echo ""
echo "=== DONE ==="
