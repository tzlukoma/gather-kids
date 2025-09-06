#!/usr/bin/env bash
set -euo pipefail

# This script repairs the migration history by marking specific versions as reverted
# and then pulls the current state from the remote database

# Ensure we have the necessary env vars
if [[ -z "${SUPABASE_PROJECT_ID:-}" ]]; then
  echo "Error: SUPABASE_PROJECT_ID environment variable is not set"
  echo "Usage: SUPABASE_PROJECT_ID=your-project-id SUPABASE_ACCESS_TOKEN=your-access-token bash repair_migrations.sh"
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Error: SUPABASE_ACCESS_TOKEN environment variable is not set"
  echo "Usage: SUPABASE_PROJECT_ID=your-project-id SUPABASE_ACCESS_TOKEN=your-access-token bash repair_migrations.sh"
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

echo "Checking migration status before repair..."
supabase migration status

echo "Repairing migration history..."
# Try to repair 00000 and 00001 as mentioned in the error message
# If this fails, it means those weren't the right versions
# We'll try additional steps afterward
supabase migration repair --status reverted 00000 00001 || echo "Could not repair 00000 and 00001, continuing with other steps..."

# Pull the current schema from the remote database
echo "Pulling schema from remote database..."
supabase db pull

echo "Checking migration status after repair..."
supabase migration status

echo "✅ Migration repair completed. Check the output for any remaining issues."
