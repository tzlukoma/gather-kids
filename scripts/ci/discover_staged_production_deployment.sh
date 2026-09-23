#!/usr/bin/env bash

# Locate the one immutable, ready Vercel Production deployment created for the
# selected main commit. This never deploys or promotes anything.
set -euo pipefail

resolved_sha="${1:-}"
if [[ ! "$resolved_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "resolved SHA must be a lowercase, full 40-character commit SHA." >&2
  exit 1
fi

for required_var in VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID; do
  if [[ -z "${!required_var:-}" ]]; then
    echo "${required_var} must be set in the production environment." >&2
    exit 1
  fi
done

list_file=$(mktemp)
detail_files=()
trap 'rm -f "$list_file" "${detail_files[@]}"' EXIT

curl --fail --silent --show-error --get \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --data-urlencode "projectId=$VERCEL_PROJECT_ID" \
  --data-urlencode "teamId=$VERCEL_ORG_ID" \
  --data-urlencode 'target=production' \
  --data-urlencode "meta-githubCommitSha=$resolved_sha" \
  --data-urlencode 'limit=100' \
  'https://api.vercel.com/v6/deployments' \
  --output "$list_file"

mapfile -t candidate_urls < <(
  node scripts/ci/select_staged_production_deployment.mjs list "$list_file" "$VERCEL_PROJECT_ID"
)

if [[ "${#candidate_urls[@]}" -eq 0 ]]; then
  echo "Vercel deployment list had no ready immutable Production candidates." >&2
  exit 1
fi

for candidate_url in "${candidate_urls[@]}"; do
  detail_file=$(mktemp)
  detail_files+=("$detail_file")
  curl --fail --silent --show-error --get \
    --header "Authorization: Bearer $VERCEL_TOKEN" \
    --data-urlencode "teamId=$VERCEL_ORG_ID" \
    "https://api.vercel.com/v13/deployments/$candidate_url" \
    --output "$detail_file"
done

node scripts/ci/select_staged_production_deployment.mjs \
  select "$resolved_sha" "$VERCEL_PROJECT_ID" "${detail_files[@]}"
