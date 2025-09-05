#!/usr/bin/env bash
# Test database setup script for gatherKids
# Creates/points to a fresh test DB and applies migrations

set -euo pipefail

# Get test database URL from environment
TEST_DATABASE_URL="${TEST_DATABASE_URL:-}"

if [[ -z "$TEST_DATABASE_URL" ]]; then
    echo "❌ TEST_DATABASE_URL environment variable is required"
    echo "   Example: TEST_DATABASE_URL='postgresql://user:pass@localhost:5432/gather_kids_test'"
    exit 1
fi

echo "🔧 Setting up test database..."
echo "   Using database: ${TEST_DATABASE_URL}"

# Check if Supabase CLI is available
if command -v supabase >/dev/null 2>&1; then
    echo "✅ Supabase CLI found"
    
    # Reset the test database
    echo "🔄 Resetting test database..."
    supabase db reset --db-url "$TEST_DATABASE_URL"
    
    echo "✅ Test database setup complete"
else
    echo "⚠️  Supabase CLI not found, skipping migration reset"
    echo "   Install Supabase CLI for full test DB setup:"
    echo "   curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
fi

# Export the test database URL for use by tests
export DATABASE_URL="$TEST_DATABASE_URL"

echo "✅ Test database environment ready"
echo "   DATABASE_URL exported for tests"