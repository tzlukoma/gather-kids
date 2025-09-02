#!/usr/bin/env bash
set -euo pipefail

# This script runs a migration status check in debug mode
# to help diagnose issues with migration version mismatches

# Ensure we have the necessary env vars
if [[ -z "${SUPABASE_PROJECT_ID:-}" ]]; then
  echo "Error: SUPABASE_PROJECT_ID environment variable is not set"
  echo "Usage: SUPABASE_PROJECT_ID=your-project-id SUPABASE_ACCESS_TOKEN=your-access-token bash check_migrations.sh"
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Error: SUPABASE_ACCESS_TOKEN environment variable is not set"
  echo "Usage: SUPABASE_PROJECT_ID=your-project-id SUPABASE_ACCESS_TOKEN=your-access-token bash check_migrations.sh"
  exit 1
fi

# Ensure Supabase CLI is available
if ! command -v supabase &> /dev/null; then
  echo "Installing Supabase CLI..."
  # Create bin directory in home if it doesn't exist
  mkdir -p "$HOME/.bin"
  
  # Download the latest version for the current platform
  if [[ "$(uname)" == "Darwin" ]]; then
    # macOS
    curl -s -L https://github.com/supabase/cli/releases/latest/download/supabase_darwin_$(uname -m).tar.gz | tar -xz -C "$HOME/.bin"
  else
    # Linux
    curl -s -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C "$HOME/.bin"
  fi
  
  # Make it executable
  chmod +x "$HOME/.bin/supabase"
  
  # Add to PATH for this session
  export PATH="$HOME/.bin:$PATH"
fi

# Export the access token
export SUPABASE_ACCESS_TOKEN

echo "Linking project..."
supabase link --project-ref "$SUPABASE_PROJECT_ID" ${SUPABASE_DB_PASSWORD:+--password "$SUPABASE_DB_PASSWORD"}

echo "Checking migration status with debug info..."
supabase migration status --debug

echo "Listing remote migrations..."
supabase db remote changes --debug

echo "✅ Migration check completed."
