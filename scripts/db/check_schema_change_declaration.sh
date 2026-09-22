#!/usr/bin/env bash
# Fail a pull request that changes supabase/migrations unless the body
# declares it. No migration diff is a pass.
# Bash 3.2 compatible (macOS /bin/bash) so local checks match CI.
set -euo pipefail

changed_file=""
if [[ "${1:-}" == "--changed-file" ]]; then
  changed_file="${2:-}"
  if [[ -z "$changed_file" || ! -f "$changed_file" ]]; then
    echo "::error::--changed-file requires an existing path list" >&2
    exit 2
  fi
fi

if [[ -n "$changed_file" ]]; then
  changed=$(grep -v '^[[:space:]]*$' "$changed_file" || true)
else
  if [[ -z "${BASE_SHA:-}" ]]; then
    echo "::error::BASE_SHA is required to detect migration changes" >&2
    exit 2
  fi
  changed=$(git diff --name-only "${BASE_SHA}...HEAD" -- supabase/migrations || true)
fi

write_summary() {
  printf '%s\n' "$1"
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    printf '%s\n' "$1" >> "$GITHUB_STEP_SUMMARY"
  fi
}

if [[ -z "${changed}" ]]; then
  write_summary "## Schema change"
  write_summary "No files changed under \`supabase/migrations\`. Schema change: none."
  exit 0
fi

file_count=$(printf '%s\n' "$changed" | grep -c .)

write_summary "## Schema change"
write_summary "This pull request changes \`supabase/migrations\`:"
write_summary ""
write_summary '```text'
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  write_summary "$path"
done <<EOF
$changed
EOF
write_summary '```'
write_summary ""
write_summary "The PR body must contain a line exactly: \`Schema change: documented\`."
write_summary "Apply the remote schema only with UAT DB deploy, then Production DB deploy (\`supabase db push\`)."

body="${PR_BODY:-}"
if printf '%s\n' "$body" | grep -Eq '^Schema change:[[:space:]]*documented[[:space:]]*$'; then
  echo "::notice::Schema change declared for ${file_count} migration path(s)."
  exit 0
fi

echo "::error::supabase/migrations changed, but the PR body has no line 'Schema change: documented'. Add it (see .github/PULL_REQUEST_TEMPLATE.md). 'Schema change: none' does not pass." >&2
exit 1
