#!/usr/bin/env bash
# Shared refusal for scripts that used to change a remote schema outside
# `supabase db push`. Do not remove this gate.
cat <<'EOF' >&2
Quarantined: this script is not a supported way to change UAT or production.

The only remote schema path is approval-gated `supabase db push`:
  UAT:        GitHub Actions → UAT DB deploy (.github/workflows/uat-db-deploy.yml)
  Production: GitHub Actions → Production DB deploy (.github/workflows/prod-db-deploy.yml)
              which calls scripts/db/apply_migrations_cli.sh

History lives only in supabase_migrations.schema_migrations.
See docs/CI_CD.md (Canonical remote schema path).
EOF
exit 1
