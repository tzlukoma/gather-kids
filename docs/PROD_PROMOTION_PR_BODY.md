PROD Promotion Runbook and Checklist

This PR contains the runbook and exact commands to promote the current schema and data to PRODUCTION.

Summary of UAT verification

- Applied `supabase/migrations/` to UAT using the safe runner.
- Imported canonical data into UAT and ran mapping repairs (guardian/scripture UUID mappings).
- Ran FK integrity checks: all checks passed in UAT.
- Ran smoke tests for key pages (scriptures, registrations, rosters) and verified content.

Runbook (execute in maintenance window)

Pre-steps (local/admin)

1. Ensure you have a recent backup of PROD (pg_dump -Fc) and confirm the backup file is stored securely.
2. Ensure `PROD_DATABASE_URL` is available and points to the production DB.
3. Notify stakeholders and schedule a maintenance window.

Exact psql loop to apply migrations (idempotent-safe runner recommended)

Option A: Use the safe runner (recommended)

```bash
chmod +x scripts/db/apply_migrations_safe.sh
./scripts/db/apply_migrations_safe.sh "$PROD_DATABASE_URL"
```

Option B: Apply each SQL file directly (explicit loop)

```bash
for f in supabase/migrations/*.sql; do
  echo "Applying $f"
  psql "$PROD_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Checklist (must be completed during the maintenance window)

- [ ] Take a final PROD snapshot: `pg_dump "$PROD_DATABASE_URL" -Fc -f prod-backup-$(date +%Y%m%dT%H%M%S).dump`
- [ ] Apply migrations (Option A recommended)
- [ ] Run FK checks: `bash scripts/db/check_fks.sh "$PROD_DATABASE_URL"`
- [ ] If the importer is required for data migration, run importer with service-role key and mapping file (careful):
      `SUPABASE_URL="$PROD_SUPABASE_URL" SUPABASE_SERVICE_ROLE_KEY="$PROD_SERVICE_ROLE_KEY" node scripts/import/importDexie.js --file <export.json> --mapping scripts/import/mappings/1756440851677-mapping.json`
- [ ] Run app smoke tests and verify key pages/flows
- [ ] Rotate keys if any were exposed during maintenance
- [ ] Monitor logs and metrics for 30–60 minutes

GitHub environment & approval guidance

- This deployment should require manual approval. Configure a `production` environment with required reviewers in the repository "Environments" settings.
- The `.github/workflows/prod-deploy.yml` workflow uses the `production` environment and will pause for approval before applying migrations.

Notes for reviewers

- Confirm `UAT_DATABASE_URL` runs in CI showing successful migration+FK checks on the UAT workflow run.
- Confirm you have backups available and a rollback plan before approving the production workflow.

If anything needs adjusting in this runbook or the exact commands, comment here and I will update the PR.
