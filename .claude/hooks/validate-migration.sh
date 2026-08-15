#!/usr/bin/env bash
set -euo pipefail

echo "Checking database migration changes..."

if git diff --cached -- supabase/migrations/ | grep -Ei \
  'DROP[[:space:]]+(TABLE|COLUMN)|TRUNCATE|DELETE[[:space:]]+FROM' \
  >/dev/null 2>&1; then
  echo "WARNING: Destructive database operation detected."
  echo "Review the migration manually before committing."
  exit 1
fi

echo "Migration validation passed."
