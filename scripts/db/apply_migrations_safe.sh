#!/usr/bin/env bash
set -euo pipefail

DB_URL="${1:-}"
MIGRATIONS_DIR="${2:-supabase/migrations}"

if [[ -z "${DB_URL}" ]]; then
  echo "Usage: $0 <DATABASE_URL> [migrations_dir]"
  exit 2
fi
if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "Migrations dir not found: ${MIGRATIONS_DIR}"
  exit 3
fi

export PGOPTIONS='-c client_min_messages=warning -c statement_timeout=60000 -c lock_timeout=60000'

echo "Applying migrations from: ${MIGRATIONS_DIR}"

# Ensure ledger table exists
psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
begin;
create table if not exists public.schema_migration_ledger (
  id bigserial primary key,
  filename text not null unique,
  checksum text not null,
  applied_at timestamptz not null default now()
);
create extension if not exists pgcrypto;
commit;
SQL

# Advisory lock to prevent concurrent runs
LOCK_SQL="select pg_advisory_lock(9223372036854);"
UNLOCK_SQL="select pg_advisory_unlock(9223372036854);"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "$LOCK_SQL" >/dev/null

mapfile -t FILES < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No migration files found."
  psql "$DB_URL" -v ON_ERROR_STOP=1 -c "$UNLOCK_SQL" >/dev/null
  exit 0
fi

for f in "${FILES[@]}"; do
  FILENAME="$(basename "$f")"
  CHECKSUM="$(sha256sum "$f" | awk '{print $1}')"

  EXISTS=$(psql "$DB_URL" -tA -c \
    "select 1 from public.schema_migration_ledger where filename = '$FILENAME'" || true)

  if [[ "$EXISTS" == "1" ]]; then
    echo "Already applied: $FILENAME"
    continue
  fi

  echo "Applying: $FILENAME"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -1 -f "$f"

  psql "$DB_URL" -v ON_ERROR_STOP=1 -c \
    "insert into public.schema_migration_ledger(filename, checksum) values ('$FILENAME', '$CHECKSUM');"
done

psql "$DB_URL" -v ON_ERROR_STOP=1 -c "$UNLOCK_SQL" >/dev/null
echo "✅ Migrations applied successfully."
