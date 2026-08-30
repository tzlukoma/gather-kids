#!/usr/bin/env bash
set -euo pipefail

DB_URL="${1:-postgresql://postgres:postgres@localhost:54322/postgres}"
TYPES_FILE="${2:-src/lib/database/supabase-types.ts}"
GENERATED="${TYPES_FILE}.new"

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: supabase CLI not found on PATH"
  exit 1
fi

normalize_types_body() {
  # Compare stable public schema shapes; ignore CLI-only metadata and extension functions.
  tail -n +7 "$1" \
    | sed '/__InternalSupabase:/,/PostgrestVersion:/d' \
    | awk '
      /^      Functions: \{/ { skip=1 }
      /^      Enums: \{/ { skip=0 }
      skip==0 { print }
    '
}

echo "Generating types from migrated schema..."
supabase gen types typescript --db-url "$DB_URL" --schema public > "$GENERATED.raw"

sed 's/export type Json/export type SupabaseJson/g; s/\bJson\b/SupabaseJson/g' \
  "$GENERATED.raw" > "$GENERATED.body"

{
  echo "/**"
  echo " * This file contains types generated from the Supabase schema."
  echo " * DO NOT EDIT MANUALLY. This file is auto-generated."
  echo " * Generated on: $(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
  echo " */"
  echo ""
  cat "$GENERATED.body"
} > "$GENERATED"

if diff -q <(normalize_types_body "$TYPES_FILE") <(normalize_types_body "$GENERATED") >/dev/null 2>&1; then
  echo "✅ Supabase types are up to date (public Tables/Enums/Views)"
  rm -f "$GENERATED" "$GENERATED.raw" "$GENERATED.body"
  exit 0
fi

echo "❌ Supabase types are out of sync with migrations!"
echo "   Run 'npm run gen:types' locally after applying migrations and commit the diff."
echo ""
diff -u <(normalize_types_body "$TYPES_FILE") <(normalize_types_body "$GENERATED") || true
rm -f "$GENERATED" "$GENERATED.raw" "$GENERATED.body"
exit 1
