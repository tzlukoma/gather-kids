#!/bin/bash
# This script helps diagnose Supabase auth issues by checking for API key validity

# Define colors for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Checking Supabase API Keys...${NC}\n"

# Check local environment file
if [ -f ".env.local" ]; then
  echo -e "${GREEN}✅ Found .env.local file${NC}"
  source .env.local
  
  LOCAL_URL="${NEXT_PUBLIC_SUPABASE_URL}"
  LOCAL_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
  
  if [ -z "$LOCAL_URL" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL is missing in .env.local${NC}"
  else
    echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_URL is set to:${NC} $LOCAL_URL"
  fi
  
  if [ -z "$LOCAL_ANON_KEY" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local${NC}"
  else
    echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_ANON_KEY exists with length:${NC} ${#LOCAL_ANON_KEY} chars"
    
    # Check if anon key looks valid by checking JWT format
    if [[ $LOCAL_ANON_KEY == *"."*"."* ]]; then
      echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be a valid JWT format${NC}"
    else
      echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY does not appear to be in JWT format${NC}"
    fi
  fi
else
  echo -e "${RED}❌ .env.local file not found${NC}"
fi

# Check UAT environment file
echo -e "\n${BLUE}🔍 Checking UAT environment:${NC}\n"

if [ -f ".env.uat" ]; then
  echo -e "${GREEN}✅ Found .env.uat file${NC}"
  source .env.uat
  
  UAT_URL="${NEXT_PUBLIC_SUPABASE_URL}"
  UAT_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
  
  if [ -z "$UAT_URL" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL is missing in .env.uat${NC}"
  else
    echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_URL is set to:${NC} $UAT_URL"
  fi
  
  if [ -z "$UAT_ANON_KEY" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.uat${NC}"
  else
    echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_ANON_KEY exists with length:${NC} ${#UAT_ANON_KEY} chars"
    
    # Check if anon key looks valid by checking JWT format
    if [[ $UAT_ANON_KEY == *"."*"."* ]]; then
      echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be a valid JWT format${NC}"
    else
      echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY does not appear to be in JWT format${NC}"
    fi
  fi
else
  echo -e "${RED}❌ .env.uat file not found${NC}"
fi

echo -e "\n${BLUE}📝 Recommendations:${NC}\n"
echo -e "1. ${YELLOW}Clear browser cache${NC} and ${YELLOW}localStorage${NC} before testing"
echo -e "2. Use ${YELLOW}npm run dev:uat${NC} to start with UAT environment"
echo -e "3. Try an incognito/private browsing window"
echo -e "4. Check the browser console for any auth-related errors\n"
echo -e "${GREEN}✅ Check complete${NC}"
