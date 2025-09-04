#!/bin/bash
# Script to run the Next.js development server with UAT environment variables

# Set up error handling
set -e

echo "🔄 Loading UAT environment variables..."

# Check if .env.uat exists
if [ ! -f ".env.uat" ]; then
  echo "❌ ERROR: .env.uat file not found!"
  exit 1
fi

# Source the .env.uat file
source .env.uat

echo "✅ UAT environment variables loaded:"
echo "- NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}"
echo "- DATABASE_URL set: $(if [ -n "$DATABASE_URL" ]; then echo "✅"; else echo "❌"; fi)"

# Export the variables so they're available to the Next.js server
export NEXT_PUBLIC_SUPABASE_URL
export NEXT_PUBLIC_SUPABASE_ANON_KEY
export SUPABASE_SERVICE_ROLE_KEY
export DATABASE_URL

# Set the database mode to supabase explicitly
export NEXT_PUBLIC_DATABASE_MODE=supabase

echo "✅ Environment configured for UAT database"
echo "📊 Database mode: ${NEXT_PUBLIC_DATABASE_MODE}"

echo "🚀 Starting Next.js development server with UAT configuration..."
npm run dev
