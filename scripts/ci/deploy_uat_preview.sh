#!/usr/bin/env bash

# Create an immutable UAT candidate from the checked-out main SHA. This script
# is deliberately the only UAT release path that invokes `vercel deploy`.
set -euo pipefail

resolved_sha="${1:-}"
if [[ ! "$resolved_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "resolved SHA must be a lowercase, full 40-character commit SHA." >&2
  exit 1
fi

for required_var in VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID UAT_SUPABASE_URL; do
  if [[ -z "${!required_var:-}" ]]; then
    echo "${required_var} must be set in the uat environment." >&2
    exit 1
  fi
done

# `vercel pull --environment=preview` links the CLI to the project and loads
# only its Preview configuration. Those Preview variables must target UAT
# Supabase; production credentials must never be present in the uat environment.
npx --yes vercel@59.24.0 pull --yes --environment=preview --token "$VERCEL_TOKEN"

# Vercel stores Preview variables in this generated dotenv file. Compare the
# public URL without echoing either side, so a Preview accidentally pointed at
# production fails before it can become a UAT migration candidate.
preview_env_file="${VERCEL_PREVIEW_ENV_FILE:-.vercel/.env.preview.local}"
if [[ ! -f "$preview_env_file" ]]; then
  echo "Vercel Preview environment configuration was not downloaded." >&2
  exit 1
fi
preview_supabase_url=$(sed -n -E 's/^NEXT_PUBLIC_SUPABASE_URL="?([^"[:space:]]+)"?$/\1/p' "$preview_env_file" | tail -n 1)
if [[ -z "$preview_supabase_url" || "$preview_supabase_url" != "$UAT_SUPABASE_URL" ]]; then
  echo "Vercel Preview NEXT_PUBLIC_SUPABASE_URL must match the UAT Supabase URL." >&2
  exit 1
fi

# Do not add --prod here. `vercel deploy` without it creates a Preview URL.
# Stamp the selected SHA and UAT environment explicitly so /api/version can
# prove the deployed build's identity before the reusable DB workflow mutates UAT.
deployment_url=$(npx --yes vercel@59.24.0 deploy --yes --token "$VERCEL_TOKEN" \
  --build-env "VERCEL_GIT_COMMIT_SHA=$resolved_sha" \
  --build-env "VERCEL_GIT_COMMIT_REF=main" \
  --build-env "NEXT_PUBLIC_DEPLOY_ENV=uat" \
  --env "NEXT_PUBLIC_DEPLOY_ENV=uat")

bash scripts/db/validate_uat_deployment_url.sh "$deployment_url"
