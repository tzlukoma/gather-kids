#!/usr/bin/env bash
set -euo pipefail

DB_URL="${1:-postgresql://postgres:postgres@localhost:54322/postgres}"
TYPES_FILE="${2:-src/lib/database/supabase-types.ts}"
GENERATED="${TYPES_FILE}.new"

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: supabase CLI not found on PATH"
  exit 1
fi

normalize_tables_section() {
  # Compare public.Tables only — ignore CLI metadata, Functions, and extension noise.
  tail -n +7 "$1" | awk '
    /^      Tables: \{/ { capture=1 }
    capture && /^      Views: \{/ { exit }
    capture { print }
  '
}

# Exit codes are load-bearing: CI retries 2 and never retries 1.
#   0 — types match
#   1 — types are out of sync (a real failure; retrying would just reprint the diff)
#   2 — generation itself failed before any comparison happened
EXIT_DRIFT=1
EXIT_GENERATION_FAILED=2

echo "Generating types from migrated schema..."
# `supabase gen types` starts a postgres-meta container pulled from ECR Public,
# where anonymous pulls are rate-limited per source IP. Shared CI runner IPs hit
# that throttle regularly, which has nothing to do with the schema — so it gets
# its own exit code rather than being reported as type drift.
if ! supabase gen types typescript --db-url "$DB_URL" --schema public > "$GENERATED.raw"; then
  echo "ERROR: type generation failed before any comparison was made."
  echo "       This is usually a transient container-registry throttle, not schema drift."
  rm -f "$GENERATED.raw"
  exit "$EXIT_GENERATION_FAILED"
fi

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

if diff -q <(normalize_tables_section "$TYPES_FILE") <(normalize_tables_section "$GENERATED") >/dev/null 2>&1; then
  echo "✅ Supabase types are up to date (public.Tables)"
  rm -f "$GENERATED" "$GENERATED.raw" "$GENERATED.body"
  exit 0
fi

echo "❌ Supabase types are out of sync with migrations!"
echo "   Run 'npm run gen:types' locally after applying migrations and commit the diff."
echo ""
diff -u <(normalize_tables_section "$TYPES_FILE") <(normalize_tables_section "$GENERATED") || true
rm -f "$GENERATED" "$GENERATED.raw" "$GENERATED.body"
exit "$EXIT_DRIFT"
