#!/usr/bin/env bash
set -euo pipefail

# Snapshot UAT DB. Usage:
#   ./scripts/db/snapshot_uat.sh "$DATABASE_URL"
# or set DATABASE_URL in env and run without args.

if [ -n "${1:-}" ]; then
  DATABASE_URL="$1"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Usage: $0 <DATABASE_URL> or set DATABASE_URL env var"
  exit 2
fi

out="uat-backup-$(date +%Y%m%dT%H%M%S).dump"
echo "Creating snapshot to $out"
pg_dump "$DATABASE_URL" -Fc -f "$out"
echo "Snapshot written: $out"
