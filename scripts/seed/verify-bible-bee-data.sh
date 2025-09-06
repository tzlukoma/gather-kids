#!/bin/bash

# Bible Bee Data Verification Script
# This script verifies that all required Bible Bee components exist in the database

# Ensure script runs from the project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/../.." || { echo "Failed to change to project root directory"; exit 1; }

# Run the JS verification script
node scripts/seed/verify-bible-bee.js
