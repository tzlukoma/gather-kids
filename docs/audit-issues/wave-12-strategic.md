## Context

Part of the [Comprehensive Application Audit](../COMPREHENSIVE-AUDIT-REPORT.md) sequencing. **Wave 12** covers strategic and ongoing improvements: monitoring, docs, and tech debt that doesn’t block other work.

**Prerequisite**: Waves 1–11 done; app stable and shipped.

## Checklist

- [ ] **MAINT-01**: Error monitoring — Integrate Sentry (or similar) for client and optionally server errors. Add source maps upload; set up alerts for new errors. Document in README.
- [ ] **MAINT-02**: Performance monitoring — Add Web Vitals reporting (e.g. send to analytics or Sentry). Track LCP, FID, CLS on production. Document in audit or README.
- [ ] **MAINT-03**: Health check — Add `/api/health` (or use existing) that returns 200 when DB and auth are reachable; use for uptime checks or k8s liveness. Document endpoint.
- [ ] **MAINT-19**: README and runbook — Update README with: how to run locally, env vars, how to run tests and lint, link to audit and this sequence. Add runbook for "deploy", "rollback", "common errors" if not already present.
- [ ] **MAINT-20**: Dependency hygiene — Enable Dependabot or Renovate; schedule quarterly audit of major upgrades. Document in CONTRIBUTING or README.
- [ ] **MAINT-21**: Audit follow-up — Revisit [COMPREHENSIVE-AUDIT-REPORT.md](../COMPREHENSIVE-AUDIT-REPORT.md) for any findings deferred or marked "later"; create follow-up issues or close with comment.
- [ ] **PERF-18**: E2E and load — If not already done: add E2E for critical path (login → check-in → roster view). Optionally add load test for heavy endpoints; document in README.

## Acceptance criteria

- Client (and optionally server) errors reported to Sentry; source maps and alerts configured.
- Web Vitals reported in production; documented.
- Health endpoint exists and documented; returns 200 when dependencies are up.
- README and runbook updated; dependency update process documented.
- Deferred audit items have follow-up issues or closure notes.
- E2E covers critical path; load test or plan documented.

## How to test

1. **Sentry**: Trigger a test error in dev/staging; confirm it appears in Sentry with source map.
2. **Web Vitals**: Load production app; check analytics or Sentry for LCP/FID/CLS.
3. **Health**: `curl /api/health` — 200 when app and DB are up; document response shape.
4. **Docs**: New contributor can follow README to run and test locally.
5. **E2E**: Run E2E suite; critical path passes in CI.
