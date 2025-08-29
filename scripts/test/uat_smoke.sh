#!/usr/bin/env bash
#set -euo pipefail

# Simple smoke tests for local Next app pointing at UAT. Usage:
#  ./scripts/test/uat_smoke.sh
# Assumes you have sourced .env.uat and run `npm run build && npm run start`.

HOST=${1:-http://localhost:3000}

echo "Checking home page..."
curl -sS "$HOST/" | head -n 20

echo
echo "Checking dashboard..."
curl -sS "$HOST/dashboard" | head -n 20

echo
# Check scriptures endpoint or page
echo "Checking scriptures page..."
curl -sS "$HOST/dashboard/ministries" | head -n 20

echo
echo "Manual checks: confirm scriptures, registrations and rosters pages load and show expected data."
