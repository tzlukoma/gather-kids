## Context

Part of the [Comprehensive Application Audit](../COMPREHENSIVE-AUDIT-REPORT.md) sequencing. **Wave 3** was the demo-mode removal refactor.

**Runtime work is done.** The factory always returns `SupabaseAdapter`. There is no `DATABASE_MODE`, `SHOW_DEMO_FEATURES`, or in-app demo users. Demos use UAT.

Leftover Dexie/IndexedDB files, tests, scripts, and docs cleanup moved to **[#266](https://github.com/tzlukoma/gather-kids/issues/266)** (supersedes [#191](https://github.com/tzlukoma/gather-kids/issues/191)). Do not treat this wave as unfinished runtime work.

- **Parent issue**: [Remove leftover demo mode and IndexedDB tech debt #266](https://github.com/tzlukoma/gather-kids/issues/266)
- **Original plan**: [#191](https://github.com/tzlukoma/gather-kids/issues/191) (runtime complete; leftover cleanup optional there, now owned by #266)
- **Audit ref**: Resolves PERF-03, MAINT-12, MAINT-13, MAINT-16, MAINT-26, MAINT-27 at runtime; leftover bundle/Dexie deletion remains in #266.

## Checklist (historical — runtime items done)

The original checklist lived in #191. Remaining deletion of unused Dexie files, tests, and npm deps is **#266**, not a second Wave 3 runtime pass.

## Acceptance criteria (runtime — met)

- App runs only against Supabase (auth + DB); no IndexedDB adapter used at runtime.
- No `DATABASE_MODE` / `SHOW_DEMO_FEATURES` in current env docs or operator instructions.
- Leftover file deletion and Jest Dexie harness: see #266.

## How to test leftover cleanup (#266)

1. **Unit**: `npm test` — all pass.
2. **Lint**: `npm run lint` — pass.
3. **Build**: `npm run build` with Supabase env set — succeeds; inspect bundle for absence of Dexie if that slice is in the PR.
4. **Runtime**: Run app with local or UAT Supabase; login, dashboard, check-in, rosters, household, register — all work without demo mode.
