## Context

Part of the [Comprehensive Application Audit](../COMPREHENSIVE-AUDIT-REPORT.md) sequencing. **Wave 10** optimizes bundle size and load strategy. Do after TypeScript and route work so code structure is stable.

**Prerequisite**: Waves 1–9 done; demo mode removed.

## Checklist

- [ ] **PERF-01**: Analyze bundle — Run `@next/bundle-analyzer` (or similar) and document top offenders (e.g. moment, heavy UI libs). Add to audit or README.
- [ ] **PERF-02**: Replace or tree-shake moment — Replace `moment` with `date-fns` or `dayjs` in one place; measure bundle delta. If acceptable, migrate remaining usages and remove moment. Alternatively, use dynamic import for moment only where needed.
- [ ] **PERF-06**: Lazy heavy components — Identify heavy components (e.g. complex forms, charts, PDF) and wrap with `next/dynamic` and optional loading placeholder. Prefer loading.tsx for route-level; use dynamic for below-the-fold or modal content.
- [ ] **PERF-07**: Route-based code splitting — Confirm each (admin) route is in its own chunk; avoid importing admin-only code from root layout. Use dynamic import for admin dashboard if it’s currently in root.
- [ ] **PERF-08**: Image optimization — Audit `<img>` and ensure critical images use `next/image` with appropriate `sizes`; add blur placeholder where helpful. Ensure no raw `<img>` for large assets.
- [ ] **PERF-09**: Font loading — Use `next/font` for primary fonts; avoid blocking render. Document in audit if already done.

## Acceptance criteria

- Bundle analysis doc or README lists main chunks and large deps; moment removed or isolated.
- No unnecessary sync imports of heavy components in critical path; lazy components have placeholders.
- Admin routes are in separate chunks; root layout stays small.
- Images use next/image with sizes; fonts use next/font.
- Lighthouse or bundle size regression check: no significant increase; target decrease where possible.

## How to test

1. **Build**: `npm run build` — note client bundle sizes in build output.
2. **Analyzer**: Run bundle analyzer; confirm no unexpected large deps in main chunk.
3. **Runtime**: Load app; Network tab shows reasonable chunk loading order; no single huge JS file for admin.
4. **Lighthouse**: Run on production build; LCP and TBT should not regress; aim for improvement.
5. **Visual**: Confirm lazy components show placeholder then content; no broken layout.
