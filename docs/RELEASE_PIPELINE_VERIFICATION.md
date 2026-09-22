# Release pipeline verification record

Use this blank template for a controlled UAT-to-production release. Save the
completed record only in a GitHub Actions summary or other redacted operational
record. Do not commit credentials, database URLs, deployment-protection tokens,
or family data.

## Release candidate

- Date (UTC):
- Operator:
- Selected immutable `main` SHA:
- New migration version:
- Immutable UAT deployment URL:
- Immutable staged-production deployment URL:

## Before UAT DB apply

- `/api/version` expected migration:
- `/api/version` applied migration:
- `/api/version` `inSync` value:
- UAT deployment `gitSha` matches selected SHA: yes / no
- UAT deployment `deployEnv` is `uat`: yes / no

## UAT DB deploy

- Dry-run workflow URL:
- Dry-run result (no mutation): pass / fail
- Apply workflow URL:
- Apply release state: `UAT verified` / failed
- Expected migration after apply:
- Applied migration after apply:
- `inSync` after apply: true / false
- Health check (`/api/health`): ok / fail

## Before production release

- Staged-production deployment reports selected SHA: yes / no
- Staged-production deployment is not assigned production domains: yes / no
- Production domain remains on prior build: yes / no

## Production release

- Production release workflow URL:
- Production environment approval by:
- Approval date (UTC):
- Promotion result: `Production released` / failed
- Expected migration after promotion:
- Applied migration after promotion:
- `inSync` after promotion: true / false
- Production health check (`/api/health`): ok / fail

## Follow-up

- Rollback or forward-fix required: no / yes
- Notes (redacted):
