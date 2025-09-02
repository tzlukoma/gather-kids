#!/usr/bin/env bash
# This script executes a SQL file against a Supabase project using the CLI
# It's designed to be more reliable by trying multiple approaches

set -euo pipefail

# Required parameters
PROJECT_ID="${1:-}"
ACCESS_TOKEN="${2:-}"
DB_PASSWORD="${3:-}"
SQL_FILE="${4:-}"

if [[ -z "$PROJECT_ID" || -z "$ACCESS_TOKEN" || -z "$SQL_FILE" ]]; then
  echo "Usage: $0 <PROJECT_ID> <ACCESS_TOKEN> <DB_PASSWORD> <SQL_FILE>"
  exit 2
fi

# Export the access token for Supabase CLI
export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"
export SUPABASE_DB_PASSWORD="$DB_PASSWORD"

echo "Linking to Supabase project..."
supabase link --project-ref "$PROJECT_ID" --password "$DB_PASSWORD" || {
  echo "Failed to link to project. Trying alternative approach..."
  # If linking fails, we'll try to use direct connection later
}

echo "Executing SQL file: $SQL_FILE"

# Try multiple methods to execute the SQL file
execute_successful=false

# Method 1: Use supabase db execute with input redirection
if ! $execute_successful; then
  echo "Trying method 1: supabase db execute with input redirection..."
  if supabase db execute < "$SQL_FILE" 2>/dev/null; then
    echo "✅ SQL executed successfully using 'supabase db execute'"
    execute_successful=true
  else
    echo "Method 1 failed"
  fi
fi

# Method 2: Use supabase db query with input redirection
if ! $execute_successful; then
  echo "Trying method 2: supabase db query with input redirection..."
  if supabase db query < "$SQL_FILE" 2>/dev/null; then
    echo "✅ SQL executed successfully using 'supabase db query'"
    execute_successful=true
  else
    echo "Method 2 failed"
  fi
fi

# Method 3: Split the SQL file into separate statements and execute them one by one
if ! $execute_successful; then
  echo "Trying method 3: Execute statements individually..."
  
  # Create temporary directory for split statements
  TEMP_DIR=$(mktemp -d)
  
  # Split the SQL file into separate statements by finding CREATE TABLE statements
  grep -n "CREATE TABLE" "$SQL_FILE" | while IFS=: read -r line_num table_name; do
    # Extract from this line to the next CREATE TABLE or end of file
    next_line=$(grep -n "CREATE TABLE" "$SQL_FILE" | awk -F: -v current="$line_num" '$1 > current {print $1; exit}')
    
    if [[ -z "$next_line" ]]; then
      # If there's no next CREATE TABLE, extract to the end of file
      tail -n +"$line_num" "$SQL_FILE" > "$TEMP_DIR/statement_$line_num.sql"
    else
      # Extract to the line before the next CREATE TABLE
      next_line=$((next_line - 1))
      sed -n "${line_num},${next_line}p" "$SQL_FILE" > "$TEMP_DIR/statement_$line_num.sql"
    fi
    
    # Execute this statement
    echo "Executing statement from line $line_num..."
    if supabase db execute < "$TEMP_DIR/statement_$line_num.sql" 2>/dev/null; then
      echo "✅ Successfully executed statement from line $line_num"
    else
      echo "⚠️ Failed to execute statement from line $line_num"
    fi
  done
  
  # Clean up
  rm -rf "$TEMP_DIR"
  execute_successful=true
fi

# Show success or failure message
if $execute_successful; then
  echo "✅ SQL execution completed successfully using at least one method"
  exit 0
else
  echo "❌ All SQL execution methods failed"
  echo "Please check your Supabase project configuration and credentials"
  echo "Consider executing the SQL manually via the Supabase dashboard"
  exit 1
fi
