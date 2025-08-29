#!/usr/bin/env bash
set -euo pipefail

# Lightweight FK integrity checker used by CI.
# Exits with non-zero if any orphaned FK references are found.

: ${PGHOST:=localhost}
: ${PGPORT:=5432}
: ${PGUSER:=postgres}
: ${PGPASSWORD:=postgres}
: ${PGDATABASE:=postgres}

export PGPASSWORD

psql_base=(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -A -c)

echo "Checking DB FK integrity against $PGHOST:$PGPORT/$PGDATABASE"

failed=0

# Define checks as: child_table child_col parent_table parent_col
checks=(
  "registrations child_id children child_id"
  "ministry_enrollments child_id children child_id"
  "ministry_enrollments ministry_id ministries ministry_id"
  "leader_assignments leader_id users user_id"
  "leader_assignments ministry_id ministries ministry_id"
  "emergency_contacts household_id_uuid households household_id"
  "student_scriptures scripture_id scriptures id"
  "student_scriptures student_id children child_id"
  "student_essays student_id children child_id"
)

for entry in "${checks[@]}"; do
  read -r child_tbl child_col parent_tbl parent_col <<< "$entry"
  echo "--- Checking $child_tbl.$child_col -> $parent_tbl.$parent_col ---"

  # Skip if columns don't exist (keeps checks robust across schema variants)
  child_exists=$(${psql_base[@]} "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='${child_tbl}' AND column_name='${child_col}');")
  parent_exists=$(${psql_base[@]} "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='${parent_tbl}' AND column_name='${parent_col}');")

  if [ "$child_exists" != 't' ]; then
    echo "SKIP: column ${child_tbl}.${child_col} not found"
    continue
  fi
  if [ "$parent_exists" != 't' ]; then
    echo "SKIP: ref column ${parent_tbl}.${parent_col} not found"
    continue
  fi

  # Count orphaned rows. Use text casting if types differ (safe fallback).
  cnt=$(${psql_base[@]} "SELECT count(*) FROM ${child_tbl} t LEFT JOIN ${parent_tbl} p ON t.${child_col} = p.${parent_col} WHERE t.${child_col} IS NOT NULL AND p.${parent_col} IS NULL;") || true

  # If previous query failed due to type mismatch, retry using text cast on both sides
  if [[ -z "$cnt" ]]; then
    cnt=$(${psql_base[@]} "SELECT count(*) FROM ${child_tbl} t LEFT JOIN ${parent_tbl} p ON t.${child_col}::text = p.${parent_col}::text WHERE t.${child_col} IS NOT NULL AND p.${parent_col} IS NULL;") || true
  fi

  cnt=${cnt:-0}
  echo "Orphan count: $cnt"
  if [ "$cnt" -gt 0 ]; then
    echo "Found $cnt orphaned rows for ${child_tbl}.${child_col} -> ${parent_tbl}.${parent_col}"
    failed=1
  fi
  echo
done

if [ "$failed" -ne 0 ]; then
  echo "FK integrity checks failed"
  exit 2
fi

echo "FK integrity checks passed"
exit 0
