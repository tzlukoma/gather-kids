#!/bin/bash
# Compatibility wrapper — in-app help validation lives in scripts/validate-help.mjs
set -euo pipefail
exec node scripts/validate-help.mjs
