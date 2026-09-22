# Database scripts

Remote schema changes use one path: `supabase db push` from the GitHub workflows documented in [`docs/CI_CD.md`](../../docs/CI_CD.md).

| Use | Script |
|-----|--------|
| UAT and production apply | `apply_migrations_cli.sh` (called by `uat-db-deploy.yml` and `prod-db-deploy.yml` only) |
| Production extension pre-step | `ensure_pgcrypto.sh` (called by `prod-db-deploy.yml` only) |
| CI migration replay | `.github/workflows/ci.yml` `db-fk` job (`ON_ERROR_STOP=1`) |
| FK check | `check_fks.sh` |
| Migration-status RPC check | `check_schema_migration_status.sql` |
| Generated-type drift | `check_types_sync.sh` |
| Read-only diagnostics | `diagnose_migrations.sh`, `list_unapplied_migrations.sh`, `check_migrations.sh`, `snapshot_uat.sh` |

Scripts that used to apply SQL outside that path exit immediately via `refuse_quarantined_mutation.sh`. That includes `apply_migrations_safe.sh` (ledger table `public.schema_migration_ledger`), table-setup generators, `execute_sql_reliable.sh`, and ad-hoc `db push` wrappers. Do not remove the refusal.
