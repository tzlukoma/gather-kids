#!/bin/bash
# Script for complete reset and fresh seeding of all data
# This will:
# 1. Reset all UAT data
# 2. Seed core UAT data
# 3. Seed Bible Bee specific data

set -e  # Exit immediately if any command fails

# Detect OS for proper echo coloring
if [[ "$OSTYPE" == "darwin"* || "$OSTYPE" == "linux-gnu"* ]]; then
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  RED='\033[0;31m'
  BLUE='\033[0;34m'
  NC='\033[0m' # No Color
else
  GREEN=''
  YELLOW=''
  RED=''
  BLUE=''
  NC=''
fi

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}     Full Reset and Seed for UAT Database      ${NC}"
echo -e "${BLUE}===============================================${NC}"

# Check for .env.local file
if [ ! -f .env.local ]; then
  echo -e "${RED}Error: .env.local file not found!${NC}"
  echo -e "${YELLOW}Please create a .env.local file with required environment variables.${NC}"
  exit 1
fi

# Step 1: Reset all UAT data
echo -e "\n${YELLOW}[1/3] Resetting all UAT data...${NC}"
npm run seed:uat:reset
if [ $? -ne 0 ]; then
  echo -e "${RED}UAT data reset failed! Exiting.${NC}"
  exit 1
fi

# Step 2: Seed core UAT data
echo -e "\n${YELLOW}[2/3] Seeding core UAT data...${NC}"
npm run seed:uat
if [ $? -ne 0 ]; then
  echo -e "${RED}UAT data seeding failed! Exiting.${NC}"
  exit 1
fi

# Step 3: Seed Bible Bee data
echo -e "\n${YELLOW}[3/3] Seeding Bible Bee data...${NC}"
npm run seed:uat:bible-bee
if [ $? -ne 0 ]; then
  echo -e "${RED}Bible Bee data seeding failed! Exiting.${NC}"
  exit 1
fi

echo -e "\n${GREEN}✅ Complete reset and seed finished successfully!${NC}"
echo -e "${GREEN}All data has been refreshed with fresh values.${NC}\n"
