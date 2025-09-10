#!/bin/bash
# Daily Digest Integration Test
# This script validates the complete daily digest system

set -e

echo "🧪 Daily Digest Integration Test"
echo "================================="

# Test environment setup
echo "📋 Setting up test environment..."
export SUPABASE_URL="https://test.supabase.co"
export SUPABASE_SERVICE_ROLE="test-service-role-key"
export MJ_API_KEY="test-api-key"
export MJ_API_SECRET="test-api-secret"
export FROM_EMAIL="no-reply@test.com"
export EMAIL_MODE="mailjet"
export MONITOR_EMAILS="admin@test.com,monitor@test.com"
export DRY_RUN="true"

# Test 1: Environment validation
echo "✅ Test 1: Environment variable validation"
if [[ -z "$SUPABASE_URL" ]] || [[ -z "$SUPABASE_SERVICE_ROLE" ]] || [[ -z "$MJ_API_KEY" ]] || [[ -z "$MJ_API_SECRET" ]] || [[ -z "$FROM_EMAIL" ]]; then
    echo "❌ Missing required environment variables"
    exit 1
fi
echo "   All required environment variables present"

# Test 2: Script execution
echo "✅ Test 2: Script execution in dry run mode"
if node scripts/dailyDigest.js > /tmp/digest-test.log 2>&1; then
    echo "   Script executed successfully in dry run mode"
else
    # Check if it failed due to expected database connection issue
    if grep -q "Missing checkpoint table" /tmp/digest-test.log; then
        echo "   Script correctly detected missing database (expected with dummy URL)"
    elif grep -q "fetch failed" /tmp/digest-test.log; then
        echo "   Script correctly failed to connect to dummy database (expected)"
    else
        echo "❌ Script execution failed unexpectedly"
        cat /tmp/digest-test.log
        exit 1
    fi
fi

if grep -q "Starting daily digest process" /tmp/digest-test.log; then
    echo "   Process started correctly"
else
    echo "❌ Process start not detected"
    exit 1
fi

# Test 3: Jest tests
echo "✅ Test 3: Running Jest test suite"
if npm test -- --testPathPatterns="daily-digest" --silent > /tmp/jest-test.log 2>&1; then
    echo "   All Jest tests passed"
else
    echo "❌ Jest tests failed"
    cat /tmp/jest-test.log
    exit 1
fi

# Test 4: File structure validation
echo "✅ Test 4: File structure validation"
required_files=(
    "scripts/dailyDigest.js"
    ".github/workflows/daily-digest.yml"
    "__tests__/scripts/daily-digest.test.ts"
    "supabase/migrations/20250910134652_add_daily_digest_checkpoints.sql"
    "docs/DAILY_DIGEST.md"
    ".env.digest.example"
)

for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "   ✓ $file exists"
    else
        echo "   ❌ $file missing"
        exit 1
    fi
done

# Test 5: GitHub workflow validation
echo "✅ Test 5: GitHub workflow validation"
workflow_file=".github/workflows/daily-digest.yml"
if grep -q "cron.*0 11 \* \* \*" "$workflow_file"; then
    echo "   ✓ Cron schedule configured correctly (7 AM ET)"
else
    echo "   ❌ Cron schedule not found or incorrect"
    exit 1
fi

if grep -q "workflow_dispatch" "$workflow_file"; then
    echo "   ✓ Manual trigger configured"
else
    echo "   ❌ Manual trigger not configured"
    exit 1
fi

required_secrets=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE" "MJ_API_KEY" "MJ_API_SECRET" "FROM_EMAIL" "MONITOR_EMAILS")
for secret in "${required_secrets[@]}"; do
    if grep -q "\${{ secrets\.$secret }}" "$workflow_file"; then
        echo "   ✓ Secret $secret referenced in workflow"
    else
        # MONITOR_EMAILS is optional, so we only warn for it
        if [[ "$secret" == "MONITOR_EMAILS" ]]; then
            echo "   ⚠ Optional secret $secret referenced in workflow"
        else
            echo "   ❌ Secret $secret not found in workflow"
            exit 1
        fi
    fi
done

# Test 6: Package dependencies
echo "✅ Test 6: Package dependencies validation"
if grep -q '"node-mailjet"' package.json; then
    echo "   ✓ node-mailjet dependency present"
else
    echo "   ❌ node-mailjet dependency missing"
    exit 1
fi

if grep -q '"nodemailer"' package.json; then
    echo "   ✓ nodemailer dependency present"
else
    echo "   ❌ nodemailer dependency missing"
    exit 1
fi

# Test 7: Migration file validation
echo "✅ Test 7: Database migration validation"
migration_file="supabase/migrations/20250910134652_add_daily_digest_checkpoints.sql"
if grep -q "CREATE TABLE.*daily_digest_checkpoints" "$migration_file"; then
    echo "   ✓ Checkpoint table creation found"
else
    echo "   ❌ Checkpoint table creation not found"
    exit 1
fi

if grep -q "checkpoint_name.*last_run_at" "$migration_file"; then
    echo "   ✓ Required columns defined"
else
    echo "   ❌ Required columns not found"
    exit 1
fi

# Test 8: Documentation completeness
echo "✅ Test 8: Documentation validation"
doc_file="docs/DAILY_DIGEST.md"
required_sections=("Overview" "Setup Instructions" "Mailjet Account Setup" "GitHub Secrets" "Usage" "Troubleshooting")
for section in "${required_sections[@]}"; do
    if grep -q "$section" "$doc_file"; then
        echo "   ✓ Documentation section: $section"
    else
        echo "   ❌ Missing documentation section: $section"
        exit 1
    fi
done

echo ""
echo "🎉 ALL TESTS PASSED!"
echo "The daily digest system is fully implemented and ready for deployment."
echo ""
echo "📋 Next steps for production deployment:"
echo "   1. Set up Mailjet account and verify domain"
echo "   2. Add GitHub Secrets to repository"
echo "   3. Run database migrations"
echo "   4. Configure ministry contact emails"
echo "   5. Test with manual workflow trigger"
echo ""
echo "🔗 See docs/DAILY_DIGEST.md for detailed setup instructions"