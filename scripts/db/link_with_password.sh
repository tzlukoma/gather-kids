#!/usr/bin/env bash
# Fully link project with password

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <project-ref> <password>"
    exit 1
fi

PROJECT_REF="$1"
DB_PASSWORD="$2"

echo "Linking project $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"

echo "Verifying project-ref after link..."
cat ./supabase/.temp/project-ref

echo "Testing push with linked project..."
supabase db push --workdir ./supabase --dry-run
