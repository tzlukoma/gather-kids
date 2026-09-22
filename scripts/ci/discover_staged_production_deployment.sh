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

payload_file=$(mktemp)
trap 'rm -f "$payload_file"' EXIT

curl --fail --silent --show-error --get \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --data-urlencode "projectId=$VERCEL_PROJECT_ID" \
  --data-urlencode "teamId=$VERCEL_ORG_ID" \
  --data-urlencode 'target=production' \
  --data-urlencode "meta-githubCommitSha=$resolved_sha" \
  'https://api.vercel.com/v6/deployments' \
  --output "$payload_file"

node scripts/ci/select_staged_production_deployment.mjs \
  "$payload_file" "$resolved_sha" "$VERCEL_PROJECT_ID" "$VERCEL_ORG_ID"
