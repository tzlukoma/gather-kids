#!/bin/bash
# Script to run the Next.js development server with UAT environment variables and authentication

# Load UAT environment variables from .env.uat file
if [ -f ".env.uat" ]; then
  echo "🔄 Loading UAT environment variables..."
  
  # Source the .env.uat file to load variables into this shell
  source .env.uat
  
  # Check if NEXT_PUBLIC_SUPABASE_ANON_KEY is missing and provide it if needed
  if [ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY}" ]; then
    echo "⚠️ Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.uat"
    echo "🔧 Using UAT anon key from the anon project reference..."
    
    # This is the anon key format used by Supabase
    export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdla291dmJldWpma2lhb3JzaGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NDM0MzEsImV4cCI6MjA3MjAxOTQzMX0.TYi-g89spavx9vYWoG8SVNgEiAOYqAquwWrqbGj0kd4"
  fi
  
  # Export the key Supabase variables that Next.js will need
  export NEXT_PUBLIC_SUPABASE_URL
  export NEXT_PUBLIC_SUPABASE_ANON_KEY
  export SUPABASE_SERVICE_ROLE_KEY
  export DATABASE_URL
  
  # Force Supabase mode for database
  export NEXT_PUBLIC_DATABASE_MODE=supabase
  export NEXT_PUBLIC_SHOW_DEMO_FEATURES=false
  
  # Configure authentication settings
  export NEXT_PUBLIC_AUTH_PROVIDER=supabase
  export NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED=true
  export NEXT_PUBLIC_LOGIN_MAGIC_ENABLED=false
  export NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED=false
  
  echo "✅ UAT environment configured:"
  echo "- NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}"
  echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:20}... (${#NEXT_PUBLIC_SUPABASE_ANON_KEY} chars)"
  echo "- DATABASE_MODE: ${NEXT_PUBLIC_DATABASE_MODE}"
  echo "- AUTH_PROVIDER: ${NEXT_PUBLIC_AUTH_PROVIDER:-supabase}"
  echo "- LOGIN_PASSWORD_ENABLED: ${NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED}"
  echo "- DEMO_FEATURES: ${NEXT_PUBLIC_SHOW_DEMO_FEATURES}"
  
  # Start the Next.js dev server
  echo "🚀 Starting Next.js development server with UAT configuration..."
  next dev --turbopack -p 9002
else
  echo "❌ ERROR: .env.uat file not found!"
  exit 1
fi
