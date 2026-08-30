#!/usr/bin/env bash
# R1 one-shot validation: Jest + Playwright + SQL assertions.
# Prerequisites:
#   - .r1-local/manifest.json filled (gitignored)
#   - Dev server on manifest app.local_base_url with UAT env loaded:
#       set -a && source .env.r1.local && set +a && npm run dev
#   - npx playwright install chromium (once)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MANIFEST="${R1_MANIFEST:-.r1-local/manifest.json}"
BASE_URL="${BASE_URL:-$(node -pe "require('./${MANIFEST#./}').app?.local_base_url || 'http://localhost:9002'")}"

echo "=== R1 Phase 3 one-shot validation ==="
echo "Manifest: $MANIFEST"
echo "BASE_URL: $BASE_URL"

if [[ ! -f "$MANIFEST" ]]; then
  echo "❌ Missing $MANIFEST"
  exit 1
fi

HOUSEHOLD_ID="$(node -pe "require('./${MANIFEST#./}').test_accounts.returning_guardian.household_id")"
FALL_2026_ID="$(node -pe "require('./${MANIFEST#./}').cycles.fall_2026_id")"
RETURNING_EMAIL="$(node -pe "require('./${MANIFEST#./}').test_accounts.returning_guardian.email")"
RETURNING_PASSWORD="$(node -pe "require('./${MANIFEST#./}').test_accounts.returning_guardian.password")"
export DATABASE_URL="$(node -pe "require('./${MANIFEST#./}').uat.database_url")"

HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" || true)"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "❌ Dev server not reachable at $BASE_URL (HTTP $HTTP_CODE)"
  echo "   Start with: set -a && source .env.r1.local && set +a && npm run dev"
  exit 1
fi
echo "✅ Dev server reachable"

echo ""
echo "=== Unit tests ==="
npm test -- --testPathPatterns='gradeUtils|household-prefill|registration-cycles|registration.contract|registration-data-flow|canonical-dal' --passWithNoTests

echo ""
echo "=== Playwright: R1 human-use suite (read-only + @mutating) ==="
R1_E2E_ENABLED=1 \
  BASE_URL="$BASE_URL" \
  R1_RETURNING_EMAIL="$RETURNING_EMAIL" \
  R1_RETURNING_PASSWORD="$RETURNING_PASSWORD" \
  npx playwright test --config=e2e.config.ts --project=chromium e2e/r1/

echo ""
echo "=== SQL post-registration assertions ==="
REG_COUNT="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -t -A \
  -c "SELECT count(*) FROM registrations r JOIN children c ON c.child_id = r.child_id WHERE c.household_id = '${HOUSEHOLD_ID}' AND r.cycle_id = '${FALL_2026_ID}';")"

DUP_COUNT="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -t -A \
  -c "SELECT count(*) FROM (SELECT me.child_id, me.ministry_id FROM ministry_enrollments me JOIN children c ON c.child_id = me.child_id WHERE c.household_id = '${HOUSEHOLD_ID}' AND me.cycle_id = '${FALL_2026_ID}' GROUP BY 1, 2 HAVING count(*) > 1) d;")"

echo "Fall 2026 registrations for test household: $REG_COUNT"
echo "Duplicate enrollments: $DUP_COUNT"

if [[ "$REG_COUNT" -lt 1 ]]; then
  echo "❌ Expected at least 1 Fall 2026 registration for test household"
  exit 1
fi
if [[ "$DUP_COUNT" != "0" ]]; then
  echo "❌ Duplicate ministry enrollments detected"
  exit 1
fi

echo ""
echo "✅ Phase 3 one-shot validation passed"
echo "   Household: $HOUSEHOLD_ID"
echo "   Fall 2026 cycle: $FALL_2026_ID"
