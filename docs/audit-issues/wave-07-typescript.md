## Context

Part of the [Comprehensive Application Audit](../COMPREHENSIVE-AUDIT-REPORT.md) sequencing. **Wave 7** turns TypeScript into a real safety net. Do this after ESLint (Wave 2) and component cleanup (Wave 6) so new types don’t fight existing patterns.

**Prerequisite**: Waves 1–2 and 6 done; demo mode removed (Wave 3).

## Checklist

- [ ] Run `tsc --noEmit` (or project script) and capture list of errors; prioritize `any` and missing null checks.
- [ ] In `tsconfig.json`, set `"strict": true` (or enable `strictNullChecks` and `noImplicitAny` if not already). Fix all new errors file-by-file or by domain (DAL, hooks, pages).
- [ ] Remove or replace `// @ts-ignore` and `// @ts-expect-error` with proper types or narrow types; document any remaining suppressions.
- [ ] Add `npm run typecheck` to CI; ensure build fails on type errors.
- [ ] Optionally add stricter rules (e.g. `noUncheckedIndexedAccess`) in a follow-up; not required for this wave.

## Acceptance criteria

- `tsconfig.json` has strict mode enabled (or equivalent strict flags).
- `npm run typecheck` (or `tsc --noEmit`) exits 0.
- No unnecessary `@ts-ignore` / `@ts-expect-error`; remaining ones documented.
- CI runs typecheck and fails on new type errors.

## How to test

1. **Typecheck**: `npm run typecheck` — passes.
2. **Build**: `npm run build` — succeeds (Next.js runs typecheck in build).
3. **Regression**: Introduce a type error (e.g. pass string where number expected); typecheck and build must fail.
4. **Unit**: `npm test` — all tests pass after type fixes.
