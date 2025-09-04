#!/bin/bash

# Script to run the Bible Bee check against the UAT database
# This loads UAT environment variables and then runs the check script

# Set up error handling
set -e

echo "🔄 Setting up UAT environment variables..."

# Check if GitHub secrets are available for UAT
if [[ -z "${SUPABASE_UAT_URL}" || -z "${SUPABASE_UAT_SERVICE_ROLE_KEY}" ]]; then
  echo "⚠️ UAT environment variables not found in current shell."
  echo "Attempting to load from GitHub Actions secrets..."
  
  # Check if we're in a GitHub Actions environment
  if [[ -n "${GITHUB_ENV}" ]]; then
    echo "Running in GitHub Actions environment..."
    # Environment variables should be set in the GitHub workflow
    if [[ -z "${SUPABASE_UAT_URL}" || -z "${SUPABASE_UAT_SERVICE_ROLE_KEY}" ]]; then
      echo "❌ ERROR: Required UAT environment variables not found in GitHub Actions."
      echo "Please ensure SUPABASE_UAT_URL and SUPABASE_UAT_SERVICE_ROLE_KEY are set in GitHub repository secrets."
      exit 1
    fi
  else
    echo "⚠️ Not running in GitHub Actions. Checking for stored credentials..."
    
    # Check if credentials are stored in user directory
    CREDENTIALS_FILE="${HOME}/.gather-kids-uat-credentials"
    if [[ -f "${CREDENTIALS_FILE}" ]]; then
      echo "Loading UAT credentials from ${CREDENTIALS_FILE}..."
      source "${CREDENTIALS_FILE}"
    else
      echo "❌ ERROR: No UAT credentials found."
      echo "Please create ${CREDENTIALS_FILE} with the following content:"
      echo "export SUPABASE_UAT_URL='your-uat-supabase-url'"
      echo "export SUPABASE_UAT_SERVICE_ROLE_KEY='your-uat-service-role-key'"
      echo ""
      echo "Or run this script with environment variables set:"
      echo "SUPABASE_UAT_URL='your-url' SUPABASE_UAT_SERVICE_ROLE_KEY='your-key' $0"
      exit 1
    fi
  fi
fi

# Validate environment variables are now set
if [[ -z "${SUPABASE_UAT_URL}" || -z "${SUPABASE_UAT_SERVICE_ROLE_KEY}" ]]; then
  echo "❌ ERROR: Required UAT environment variables still not set after loading attempts."
  exit 1
fi

echo "✅ UAT environment variables loaded."
echo "🔄 Running Bible Bee data check against UAT database..."

# Run the check script with environment variables passed through
SUPABASE_UAT_URL="${SUPABASE_UAT_URL}" \
SUPABASE_UAT_SERVICE_ROLE_KEY="${SUPABASE_UAT_SERVICE_ROLE_KEY}" \
node scripts/debug/check-uat-bible-bee-data.js

echo "✅ UAT data check complete."
