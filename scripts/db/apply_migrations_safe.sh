#!/usr/bin/env bash
set -euo pipefail

# Safe migrations runner
# Usage: ./scripts/db/apply_migrations_safe.sh "$DATABASE_URL"

if [ -n "${1:-}" ]; then
  DATABASE_URL="$1"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Usage: $0 <DATABASE_URL> or set DATABASE_URL env var"
  exit 2
fi

echo "Applying migrations from supabase/migrations to target: ${DATABASE_URL}"

shopt -s nullglob
for f in supabase/migrations/*.sql; do
  echo "--- Processing $f ---"
  lc=$(tr '[:upper:]' '[:lower:]' < "$f")

  if echo "$lc" | grep -qE 'concurrent|create index concurrently|create extension|alter type'; then
    echo "Applying $f without transaction (contains non-transactional statements)"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
  else
    echo "Applying $f inside a transaction"
    tmpfile=$(mktemp)
    printf '%s\n' "BEGIN;" > "$tmpfile"
    cat "$f" >> "$tmpfile"
    printf '%s\n' "COMMIT;" >> "$tmpfile"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$tmpfile"
    rm -f "$tmpfile"
  fi
done

echo "Migrations applied."