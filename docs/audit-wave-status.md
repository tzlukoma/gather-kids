# Audit Wave Status

Tracks implementation progress for the waves defined in [COMPREHENSIVE-AUDIT-REPORT.md](./COMPREHENSIVE-AUDIT-REPORT.md).

Last updated: 2026-03-22

---

## Wave summary

| Wave | GitHub Issue | Title | Branch / PR | Status |
|------|-------------|-------|-------------|--------|
| 1 | [#196](https://github.com/tzlukoma/gather-kids/issues/196) | Quick wins (isolated fixes) | — | Deferred — open |
| 2 | [#197](https://github.com/tzlukoma/gather-kids/issues/197) | ESLint safety net | — | Deferred — open |
| 3 | [#266](https://github.com/tzlukoma/gather-kids/issues/266) | Demo mode leftover cleanup (Dexie/IndexedDB files) | — | Runtime done; leftover cleanup in #266 (supersedes #191) |
| 4 | [#198](https://github.com/tzlukoma/gather-kids/issues/198) | Auth and state stabilization | — | Deferred — open |
| 5 | [#199](https://github.com/tzlukoma/gather-kids/issues/199) | Data layer cleanup | — | Deferred — open |
| 6 | [#200](https://github.com/tzlukoma/gather-kids/issues/200) | Component architecture | — | Deferred — open |
| 7 | [#201](https://github.com/tzlukoma/gather-kids/issues/201) | TypeScript strict safety net | — | Deferred — open |
| 8 | [#202](https://github.com/tzlukoma/gather-kids/issues/202) | Route restructure (UX-15) | `maintenance/application-audit` | Partially addressed — route groups restructured |
| 9 | [#203](https://github.com/tzlukoma/gather-kids/issues/203) | Route error and loading infrastructure | — | Deferred — open |
| 10 | [#204](https://github.com/tzlukoma/gather-kids/issues/204) | Bundle optimization | — | Deferred — open |
| 11 | [#205](https://github.com/tzlukoma/gather-kids/issues/205) | Accessibility and usability polish | — | Deferred — open |
| 12 | [#206](https://github.com/tzlukoma/gather-kids/issues/206) | Strategic and ongoing (monitoring, docs, tech debt) | `worktree-agent-a8e2f049` | **Done** — see below |

---

## Wave 12 — completed items

Wave 12 was implemented on 2026-03-22 via `worktree-agent-a8e2f049` branched from `maintenance/application-audit`.

| Item | Description | Outcome |
|------|-------------|---------|
| MAINT-01 | Sentry integration | `@sentry/nextjs` was already present. `sentry.server.config.ts` and `sentry.edge.config.ts` existed. Added the missing `sentry.client.config.ts` for browser-side error capture. |
| MAINT-02 | Web Vitals reporting | Added `src/components/analytics/web-vitals.tsx` (uses Next.js `useReportWebVitals`). Component is rendered in `src/app/layout.tsx`. |
| MAINT-03 | Health check endpoint | Created `src/app/api/health/route.ts` — returns `{ status: 'ok', timestamp }` with HTTP 200. |
| MAINT-19 | README update | Added Monitoring, Health Check, Dependabot, Testing, and Audit docs sections to `README.md`. |
| MAINT-20 | Dependabot | Added `.github/dependabot.yml` with weekly npm schedule and minor/patch grouping. |
| MAINT-21 | Audit follow-up | This file (`docs/audit-wave-status.md`). |
| PERF-18 | E2E coverage note | Documented in `docs/testing.md` — login → check-in → roster view flow is **not yet covered** by E2E tests. |

---

## Deferred items (follow-up issues required)

The following high-priority items from the audit report are **not yet implemented** and each warrants a dedicated GitHub issue or PR:

- **MAINT-04 / MAINT-05**: Build safety re-enabled (`typescript.ignoreBuildErrors`, `eslint.ignoreDuringBuilds` both `true` in `next.config.ts`) — Wave 2 prerequisite.
- **MAINT-06**: God files (`dal.ts`, `supabase-adapter.ts`, `register/page.tsx`, `bible-bee-manage.tsx`) need splitting — Wave 5.
- **MAINT-07**: Zero error boundaries — no `error.tsx` at any route segment — Wave 9.
- **MAINT-08 – MAINT-12**: TypeScript `any` pervasive usage — Wave 7.
- **PERF-01 – PERF-04**: Every page is `'use client'`; no Server Components — Wave 5 / Wave 10.
- **PERF-18**: E2E tests do not cover the login → check-in → roster flow — see `docs/testing.md`.
- **UX-04**: HTML entity `&apos;` in JS strings rendering as literal text — Wave 1.
- **Waves 1–7, 9–11**: All remain open; see the wave table above for linked GitHub issues.
