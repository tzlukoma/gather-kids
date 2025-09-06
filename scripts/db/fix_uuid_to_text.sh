#!/usr/bin/env bash
# This script fixes migration issues by safely applying UUID to text conversions

set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <connection-string>"
    exit 1
fi

DB_URL="$1"

echo "=== SUPABASE MIGRATION FIX - UUID TO TEXT ==="
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

# Create a helper function to safely convert a column from UUID to text
safe_convert_uuid_to_text() {
    local table_name="$1"
    local column_name="$2"
    
    echo ""
    echo "Converting $table_name.$column_name from UUID to TEXT..."
    
    # Check if table exists
    if ! psql "$DB_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table_name')" | grep -q "t"; then
        echo "  ✗ Table $table_name does not exist, skipping..."
        return
    fi
    
    # Check if column exists
    if ! psql "$DB_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = '$table_name' AND column_name = '$column_name')" | grep -q "t"; then
        echo "  ✗ Column $column_name does not exist in $table_name, skipping..."
        return
    fi
    
    # Get column type
    local column_type=$(psql "$DB_URL" -t -c "SELECT data_type FROM information_schema.columns WHERE table_name = '$table_name' AND column_name = '$column_name'" | xargs)
    echo "  ├─ Current column type: $column_type"
    
    # Check if already text
    if [ "$column_type" = "text" ]; then
        echo "  ✓ Column is already text type, no conversion needed"
        return
    fi
    
    # If UUID type, proceed with conversion
    if [ "$column_type" = "uuid" ]; then
        # Create a temporary column
        echo "  ├─ Creating temporary column ${column_name}_text..."
        psql "$DB_URL" -c "ALTER TABLE $table_name ADD COLUMN ${column_name}_text TEXT;"
        
        # Copy UUID values as text
        echo "  ├─ Copying UUID values as text..."
        psql "$DB_URL" -c "UPDATE $table_name SET ${column_name}_text = $column_name::text;"
        
        # Drop the original column
        echo "  ├─ Dropping original UUID column..."
        psql "$DB_URL" -c "ALTER TABLE $table_name DROP COLUMN $column_name;"
        
        # Rename the text column to the original name
        echo "  ├─ Renaming text column to original name..."
        psql "$DB_URL" -c "ALTER TABLE $table_name RENAME COLUMN ${column_name}_text TO $column_name;"
        
        echo "  ✓ Successfully converted $table_name.$column_name from UUID to TEXT"
    else
        echo "  ✗ Column is neither UUID nor TEXT (type: $column_type), cannot safely convert"
    fi
}

# Convert ID columns in all relevant tables
echo ""
echo "Step 2: Converting UUID columns to TEXT..."

# List of tables and their ID columns to convert
declare -A TABLES_TO_CONVERT=(
    ["profiles"]="id"
    ["check_ins"]="id child_id guardian_id leader_id"
    ["check_outs"]="id check_in_id guardian_id leader_id"
    ["children"]="id family_id"
    ["families"]="id"
    ["guardians"]="id family_id"
    ["leaders"]="id"
    ["permissions"]="id leader_id"
    ["audit_logs"]="id actor_id"
    ["congregations"]="id"
    ["auth_user"]="id"
)

for table in "${!TABLES_TO_CONVERT[@]}"; do
    columns="${TABLES_TO_CONVERT[$table]}"
    for column in $columns; do
        safe_convert_uuid_to_text "$table" "$column"
    done
done

echo ""
echo "Step 3: Verifying all conversions..."
for table in "${!TABLES_TO_CONVERT[@]}"; do
    columns="${TABLES_TO_CONVERT[$table]}"
    for column in $columns; do
        if psql "$DB_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table')" | grep -q "t"; then
            column_type=$(psql "$DB_URL" -t -c "SELECT data_type FROM information_schema.columns WHERE table_name = '$table' AND column_name = '$column_name' 2>/dev/null" | xargs)
            if [ "$column_type" = "text" ]; then
                echo "✓ $table.$column successfully converted to text"
            else
                echo "✗ $table.$column is not text type: $column_type"
            fi
        fi
    done
done

echo ""
echo "=== MANUAL DATABASE CONVERSION COMPLETED ==="
echo "You can now retry the migration push with 'supabase db push'"
echo "=== DONE ==="
