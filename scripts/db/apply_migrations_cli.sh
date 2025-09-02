#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-}"
ACCESS_TOKEN="${2:-}"

if [[ -z "$PROJECT_ID" || -z "$ACCESS_TOKEN" ]]; then
  echo "Usage: $0 <PROJECT_ID> <ACCESS_TOKEN>"
  exit 2
fi

# Install Supabase CLI using the official method
if ! command -v supabase &> /dev/null; then
  echo "Installing Supabase CLI..."
  # Create bin directory in home if it doesn't exist
  mkdir -p "$HOME/.bin"
  
  # Download the latest version for Linux (GitHub Actions uses Ubuntu)
  curl -s -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C "$HOME/.bin"
  
  # Make it executable
  chmod +x "$HOME/.bin/supabase"
  
  # Add to PATH
  export PATH="$HOME/.bin:$PATH"
  echo "export PATH=$HOME/.bin:\$PATH" >> "$HOME/.bashrc"
fi

# Export the access token for Supabase CLI
export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"

echo "Linking project..."
# Use --no-interactive to avoid password prompts
$HOME/.bin/supabase link --project-ref "$PROJECT_ID" --no-password

echo "Pushing migrations..."
# Use --no-verify-migrations to avoid interactive confirmation
$HOME/.bin/supabase db push --no-verify-migrations --dry-run
echo "Dry run successful. Applying migrations..."
$HOME/.bin/supabase db push --no-verify-migrations

echo "✅ Migrations applied successfully."
