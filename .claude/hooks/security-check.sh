#!/usr/bin/env bash
set -euo pipefail

echo "Running Drip Nation security checks..."

if git ls-files | grep -E '(^|/)(\.env|\.env\.local|.*\.pem|.*\.key)$' >/dev/null 2>&1; then
  echo "ERROR: Potential secret file tracked by Git."
  exit 1
fi

if git diff --cached | grep -Ei \
  '(service[_-]?role|secret[_-]?key|password\s*=|api[_-]?key\s*=|access[_-]?token\s*=)' \
  >/dev/null 2>&1; then
  echo "WARNING: Potential credential detected in staged changes."
  exit 1
fi

echo "Security check passed."
