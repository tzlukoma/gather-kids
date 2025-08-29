PROD Promotion runbook (template)

1. Pre-checks

- Ensure UAT FK checks passed and smoke tests completed.
- Take final UAT snapshot: `./scripts/db/snapshot_uat.sh "$DATABASE_URL"`

2. Backup PROD

- In PROD maintenance window, take a PROD snapshot:
  `pg_dump "$PROD_DATABASE_URL" -Fc -f "prod-backup-$(date +%Y%m%dT%H%M%S).dump"`

3. Apply migrations

- Run all SQL files from `supabase/migrations/` in order on PROD:
  ```bash
  for f in supabase/migrations/*.sql; do
    echo "Applying $f"
    psql "$PROD_DATABASE_URL" -f "$f"
  done
  ```

4. Run importer (if required)

- If you need to import data from a canonical export, run the importer with the PROD service role key. Be careful; this is a destructive action.

5. Run FK checks and smoke tests

- `bash scripts/db/check_fks.sh "$PROD_DATABASE_URL"`
- Deploy app and run smoke tests.

6. Post-migration

- Rotate service role keys and other secrets if changed.
- Monitor logs and metrics for 30-60 minutes.
