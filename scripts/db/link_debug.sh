#!/usr/bin/env bash
# This script tests project linking and debug temp dir issues

set -euo pipefail

echo "=== SUPABASE LINK DEBUG SCRIPT ==="

# Create fresh temp directory
echo "Creating fresh temp directory..."
rm -rf ./supabase/.temp
mkdir -p ./supabase/.temp
echo "Fresh temp directory created."

# Set the project-ref file manually
PROJECT_REF="tfvzdjaebqirmowvgowz"
echo "Setting project-ref to: $PROJECT_REF"
echo -n "$PROJECT_REF" > ./supabase/.temp/project-ref
echo "Manual project-ref file contents:"
cat ./supabase/.temp/project-ref
echo ""

# Run the link command 
echo "Running supabase link..."
supabase link --project-ref "$PROJECT_REF" --debug

# Verify the file afterward
echo ""
echo "Verifying project-ref file after link command:"
cat ./supabase/.temp/project-ref
echo ""

# Check if we can run db status
echo "Checking if we can run db status..."
supabase db status --debug || echo "Failed to run db status"

# Test push with debug
echo ""
echo "Testing db push dry-run..."
supabase db push --workdir ./supabase --dry-run --debug || echo "Failed to run db push"

echo ""
echo "=== END OF DEBUG SCRIPT ==="
