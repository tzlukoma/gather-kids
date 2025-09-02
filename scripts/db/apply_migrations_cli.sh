#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-}"
ACCESS_TOKEN="${2:-}"

if [[ -z "$PROJECT_ID" || -z "$ACCESS_TOKEN" ]]; then
  echo "Usage: $0 <PROJECT_ID> <ACCESS_TOKEN>"
  exit 2
fi

# Install Supabase CLI if needed
if ! command -v supabase &> /dev/null; then
  echo "Installing Supabase CLI..."
  npm install -g supabase
fi

# Export the access token for Supabase CLI
export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"

echo "Linking project..."
supabase link --project-ref "$PROJECT_ID"

echo "Pushing migrations..."
supabase db push

echo "✅ Migrations applied successfully."
