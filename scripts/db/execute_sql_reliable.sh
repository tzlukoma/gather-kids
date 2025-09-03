#!/usr/bin/env bash
# This script executes a SQL file against a Supabase project using the CLI
# It's designed to be more reliable by trying multiple approaches

set -euo pipefail

# Required parameters
PROJECT_ID="${1:-}"
ACCESS_TOKEN="${2:-}"
DB_PASSWORD="${3:-}"
SQL_FILE="${4:-}"

if [[ -z "$PROJECT_ID" || -z "$ACCESS_TOKEN" || -z "$SQL_FILE" ]]; then
  echo "Usage: $0 <PROJECT_ID> <ACCESS_TOKEN> <DB_PASSWORD> <SQL_FILE>"
  exit 2
fi

# Export the access token for Supabase CLI
export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"
export SUPABASE_DB_PASSWORD="$DB_PASSWORD"

echo "Linking to Supabase project..."
supabase link --project-ref "$PROJECT_ID" --password "$DB_PASSWORD" || {
  echo "Failed to link to project. Trying alternative approach..."
  # If linking fails, we'll try to use direct connection later
}

echo "Executing SQL file: $SQL_FILE"

# We'll create a temporary supabase workdir containing a single migration file
TEMP_WORKDIR=$(mktemp -d)
mkdir -p "$TEMP_WORKDIR/supabase/migrations"

# Create a timestamped migration filename
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_FILE="$TEMP_WORKDIR/supabase/migrations/${TIMESTAMP}_ad_hoc.sql"
cp "$SQL_FILE" "$MIGRATION_FILE"

echo "Created temporary migration: $MIGRATION_FILE"

# Link project (best-effort) and push migrations from the temporary workdir
if supabase link --project-ref "$PROJECT_ID" --password "$DB_PASSWORD" 2>/dev/null; then
  echo "Linked project successfully"
else
  echo "Warning: Could not link project via supabase CLI (continuing; db push may still work with --workdir)"
fi

if supabase db push --workdir "$TEMP_WORKDIR" --include-all --linked; then
  echo "✅ SQL executed successfully via temporary migration and db push"
  rm -rf "$TEMP_WORKDIR"
  exit 0
else
  echo "❌ Failed to apply SQL via db push from temporary workdir"
  echo "Cleaning up temporary files..."
  rm -rf "$TEMP_WORKDIR"
  exit 1
fi
