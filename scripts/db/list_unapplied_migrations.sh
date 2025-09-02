#!/usr/bin/env bash
set -euo pipefail

DB_URL="${1:-}"
MIGRATIONS_DIR="${2:-supabase/migrations}"

if [[ -z "$DB_URL" ]]; then
  echo "Usage: $0 <DATABASE_URL> [migrations_dir]"
  exit 2
fi
if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migrations dir not found: $MIGRATIONS_DIR"
  exit 3
fi

# Ensure ledger exists
psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
begin;
create table if not exists public.schema_migration_ledger (
  id bigserial primary key,
  filename text not null unique,
  checksum text not null,
  applied_at timestamptz not null default now()
);
commit;
SQL

echo "== Unapplied migrations =="

mapfile -t APPLIED < <(psql "$DB_URL" -tA -c "select filename from public.schema_migration_ledger order by filename asc")
mapfile -t FILES < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)

COUNT=0
for f in "${FILES[@]}"; do
  FILENAME="$(basename "$f")"
  if printf '%s\n' "${APPLIED[@]}" | grep -qx "$FILENAME"; then
    continue
  fi
  echo " - $FILENAME"
  COUNT=$((COUNT+1))
done

if [[ $COUNT -eq 0 ]]; then
  echo " (none)"
fi
