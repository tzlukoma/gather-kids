#!/usr/bin/env bash
# Read-only Playwright smoke against a Vercel Preview (no @mutating submit tests).
# Usage:
#   BASE_URL=https://your-preview.vercel.app ./scripts/r1/uat-preview-smoke.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:?Set BASE_URL to the Vercel Preview URL}"

echo "=== R1 UAT Preview smoke (read-only Playwright) ==="
echo "BASE_URL: $BASE_URL"

HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" || true)"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "❌ Preview not reachable (HTTP $HTTP_CODE)"
  exit 1
fi

R1_E2E_ENABLED=1 \
  BASE_URL="$BASE_URL" \
  npx playwright test --config=e2e.config.ts --project=chromium e2e/r1/ --grep-invert @mutating

echo ""
echo "✅ Preview read-only Playwright passed"
echo "   Complete the human checklist: docs/R1_UAT_SMOKE.md"
