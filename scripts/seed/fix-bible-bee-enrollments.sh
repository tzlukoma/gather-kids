#!/bin/bash

# Fix Bible Bee Enrollments Script
# This script fixes Bible Bee enrollments by ensuring all Bible Bee ministry enrollments
# have corresponding entries in the bible_bee_enrollments table

# Ensure script runs from the project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/../.." || { echo "Failed to change to project root directory"; exit 1; }

# Print header
echo "====================================="
echo "🐝 Bible Bee Enrollment Fix Script 🐝"
echo "====================================="
echo

# Check if .env.uat exists
if [ ! -f ".env.uat" ]; then
    echo "❌ Error: .env.uat file not found!"
    echo "Please create a .env.uat file with Supabase credentials."
    exit 1
fi

# Run the fix script
echo "🔄 Running Bible Bee enrollment fix script..."
node scripts/seed/fix-bible-bee-enrollments.js

# Check result
if [ $? -eq 0 ]; then
    echo
    echo "✅ Bible Bee enrollments have been fixed!"
    echo
    echo "You can now run the regular seed script with:"
    echo "npm run seed:uat:reset"
else
    echo
    echo "❌ Error fixing Bible Bee enrollments."
    echo "Please check the error messages above."
fi
