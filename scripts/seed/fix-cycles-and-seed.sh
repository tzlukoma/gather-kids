#!/bin/bash

# Script to fix registration cycles table and then run UAT seed
# This script ensures the registration_cycles table exists before running the seed script

# Use .env.uat file specifically for UAT environment
ENV_FILE=".env.uat"

echo "🚀 Starting registration_cycles fix and UAT seed process..."
echo "Using environment file: $ENV_FILE"

# Set current directory to script directory
cd "$(dirname "$0")"
cd ../..

# Check if the env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: $ENV_FILE file not found!"
  echo "Please create the .env.uat file with the required Supabase credentials for UAT"
  exit 1
fi

# Generate SQL for creating registration_cycles table
echo "Step 1: Generating SQL for table creation..."
DOTENV_CONFIG_PATH="$ENV_FILE" node -r dotenv/config scripts/debug/generate-registration-cycles-sql.js

# Ask if the user has created the table manually
echo ""
read -p "Have you created the registration_cycles table in the Supabase SQL Editor? (y/n) " answer

if [[ ! "$answer" =~ ^[Yy]$ ]]; then
  echo "⚠️ Please create the registration_cycles table using the SQL shown above"
  echo "Then run this script again"
  exit 1
fi

echo "✅ Great! Continuing with the seeding process..."

# Run UAT seed script
echo "Step 2: Running UAT seed script..."
DOTENV_CONFIG_PATH="$ENV_FILE" node -r dotenv/config scripts/seed/uat_seed.js

# Check exit status
if [ $? -ne 0 ]; then
  echo "❌ UAT seeding process failed"
  exit 1
else
  echo "✅ UAT seeding completed successfully!"
fi

echo "🎉 All done! Your database has been populated with test data."
