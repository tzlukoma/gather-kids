#!/usr/bin/env bash

# Accept only a Vercel deployment origin. Branch aliases such as
# project-git-main-team.vercel.app are mutable and cannot safely identify a
# release candidate while a database migration is running.
set -euo pipefail

url="${1:-}"
url="${url%/}"

if [[ ! "$url" =~ ^https://[a-z0-9][a-z0-9-]*\.vercel\.app$ || "$url" == *-git-* ]]; then
  echo "deployment_url must be an immutable https://….vercel.app deployment origin, not a branch alias, production domain, or path." >&2
  exit 1
fi

printf '%s\n' "$url"
