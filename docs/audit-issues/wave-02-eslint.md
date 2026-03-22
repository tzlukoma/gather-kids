## Context

Part of the [Comprehensive Application Audit](../COMPREHENSIVE-AUDIT-REPORT.md) sequencing. **Wave 2** enables ESLint as a safety net before the large demo mode refactor (Wave 3). Do not enable TypeScript build errors yet — too many existing issues; that comes in Wave 7.

## Checklist

- [ ] Run `npx next lint` and capture current violation count.
- [ ] Fix all reported ESLint violations (or document and fix any that are intentionally suppressed).
- [ ] In `next.config.ts`, set `eslint.ignoreDuringBuilds: false`.
- [ ] Add `npm run lint` (or equivalent) to CI if not already present.
- [ ] Confirm `npm run build` runs lint and fails on new violations.

## Acceptance criteria

- `npx next lint` exits 0 with no errors or warnings (or only agreed exceptions).
- `next.config.ts` has `eslint.ignoreDuringBuilds: false`.
- CI runs lint on every PR.
- Build fails when new lint violations are introduced.

## How to test

1. Locally: `npx next lint` — must pass.
2. Introduce an obvious violation (e.g. unused variable); lint must fail.
3. Run full test suite and build; both must pass.
4. Optionally open a PR and confirm CI runs lint.
