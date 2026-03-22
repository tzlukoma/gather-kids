## Context

Part of the [Comprehensive Application Audit](../COMPREHENSIVE-AUDIT-REPORT.md) sequencing. **Wave 6** improves component architecture: shared UI primitives and consistent patterns. Do this before TypeScript strictness (Wave 7) so new types align with the intended structure.

**Prerequisite**: Wave 5 (data layer) complete preferred; can overlap with Wave 7 if needed.

## Checklist

- [ ] **UX-01**: Shared loading skeleton — Create or adopt a shared skeleton component (e.g. `CardGridSkeleton` with `count` prop) and use it consistently on dashboard, check-in, and rosters. Ensure design matches UX-10 fix (correct prop name and count).
- [ ] **UX-02**: Shared empty state — Create a reusable `EmptyState` component (icon + title + optional description + optional CTA). Use it on rosters, check-in, and any list that can be empty. Replace ad-hoc "No items" blocks.
- [ ] **MAINT-14**: Extract repeated form patterns — Audit forms (e.g. create child, edit household, register) and extract shared patterns: labeled input + error, submit/cancel buttons, optional "required" indicator. Prefer composition over a single giant form component; document in Storybook or README if available.
- [ ] **MAINT-15**: Button variants — Ensure primary/secondary/danger/ghost buttons use a single source (e.g. `Button` from `@/components/ui/button` or design system). Replace raw `<button>` and inconsistent classNames with the shared component; add `variant` and `size` props if missing.
- [ ] **MAINT-18**: Modal focus trap — In `Modal` or `Dialog` component, implement focus trap (e.g. focus-first-focusable on open, trap Tab, focus return on close). Use `focus-trap-react` or Radix behavior; ensure Escape closes and focus returns to trigger.

## Acceptance criteria

- Dashboard, check-in, and rosters use the same loading skeleton pattern and prop interface.
- All empty lists use the shared EmptyState component (or documented exception).
- Forms use shared labeled-input and submit/cancel patterns; no one-off form markup repeated in 3+ places.
- Buttons come from the design system component with consistent variants.
- Modals/dialogs trap focus and return focus on close; Escape closes.

## How to test

1. **Visual**: Load dashboard, check-in, rosters — skeletons look consistent; empty states show shared layout.
2. **Manual**: Open each modal/dialog; Tab cycles only within modal; Escape closes; focus returns to trigger.
3. **Unit**: If Storybook or component tests exist, run them; add tests for EmptyState and skeleton if feasible.
4. **Lint**: `npx next lint` — pass.
