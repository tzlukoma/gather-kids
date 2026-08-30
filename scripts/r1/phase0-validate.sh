#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MANIFEST="${R1_MANIFEST:-.r1-local/manifest.json}"

echo "=== R1 Phase 0 validation ==="

if [[ ! -f "$MANIFEST" ]]; then
  echo "❌ Missing $MANIFEST"
  echo "   cp .r1-local/manifest.example.json .r1-local/manifest.json"
  echo "   Then fill UAT keys and cycle IDs (never commit manifest.json)."
  exit 1
fi

node -e "
const m = require('./${MANIFEST#./}');
if (!m.uat?.database_url) throw new Error('manifest.uat.database_url missing');
if (!m.cycles?.fall_2025_id) throw new Error('manifest.cycles.fall_2025_id missing');
if (!m.cycles?.fall_2026_id || m.cycles.fall_2026_id.includes('PASTE')) {
  throw new Error('manifest.cycles.fall_2026_id missing — run P0.3 first');
}
if (!m.decisions) throw new Error('manifest.decisions missing — complete P0.6');
console.log('✅ manifest.json parses');
"

export DATABASE_URL="$(node -pe "require('./${MANIFEST#./}').uat.database_url")"
FALL_2025_ID="$(node -pe "require('./${MANIFEST#./}').cycles.fall_2025_id")"
FALL_2026_ID="$(node -pe "require('./${MANIFEST#./}').cycles.fall_2026_id")"

echo ""
echo "=== Database prerequisites (UAT) ==="
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v fall_2025_id="$FALL_2025_ID" \
  -v fall_2026_id="$FALL_2026_ID" \
  -f scripts/db/r1-prerequisites-check.sql

echo ""
echo "=== Unit test baseline ==="
npm test -- --testPathPatterns='canonical-dal|gradeUtils|registration' --passWithNoTests

echo ""
echo "=== Hardcoded cycle fallback grep (pre-Phase-1 baseline) ==="
rg "cycle_id \|\| '2025'|parseInt\(currentCycleId" src --count-matches || true

echo ""
echo "Done. If phase0_pass is true above, Phase 0 DB gate passed."
