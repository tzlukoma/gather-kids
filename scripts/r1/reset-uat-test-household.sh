#!/usr/bin/env bash
# Reset Fall 2026 registration + enrollments for the manifest test household on UAT.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MANIFEST="${R1_MANIFEST:-.r1-local/manifest.json}"
if [[ ! -f "$MANIFEST" ]]; then
  echo "❌ Missing $MANIFEST"
  exit 1
fi

export DATABASE_URL="$(node -pe "require('./${MANIFEST#./}').uat.database_url")"
HOUSEHOLD_ID="$(node -pe "require('./${MANIFEST#./}').test_accounts.returning_guardian.household_id")"
FALL_2026_ID="$(node -pe "require('./${MANIFEST#./}').cycles.fall_2026_id")"

echo "=== Reset R1 test household on UAT ==="
echo "Household: $HOUSEHOLD_ID"
echo "Cycle:     $FALL_2026_ID"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v household_id="$HOUSEHOLD_ID" \
  -v fall_2026_id="$FALL_2026_ID" \
  -f scripts/db/r1-reset-test-household-cycle.sql

echo ""
echo "✅ Test household reset. Log in as returning guardian → expect /register"
