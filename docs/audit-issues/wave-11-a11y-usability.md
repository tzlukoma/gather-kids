## Context

Part of the [Comprehensive Application Audit](../COMPREHENSIVE-AUDIT-REPORT.md) sequencing. **Wave 11** addresses accessibility and usability polish. Do after components and routes are stable so a11y fixes aren’t reverted by refactors.

**Prerequisite**: Waves 1–10 done.

## Checklist

- [ ] **A11Y-01**: Heading hierarchy — Audit dashboard, check-in, rosters, household; ensure single h1 per page and logical order (h1 → h2 → h3). Fix any "skip from h2 to h5" or duplicate h1.
- [ ] **A11Y-02**: Focus management — After modal open/close (Wave 6), confirm focus trap and return. Ensure "Skip to main content" link exists and targets main landmark; test with keyboard only.
- [ ] **A11Y-03**: Form labels — All inputs have visible `<label>` or `aria-label`; no placeholder-only labels. Required fields have `aria-required` or `required` and visible indicator.
- [ ] **A11Y-04**: Color contrast — Run axe or Lighthouse on key pages; fix contrast on text and buttons to meet WCAG AA. Fix any "link vs body text" contrast issues.
- [ ] **A11Y-05**: Touch targets — Buttons and links at least 44×44px (or 24px spacing); no overlapping hit areas. Fix on mobile viewports.
- [ ] **USE-01**: Session timeout / re-auth — If app has long sessions, add optional "session expired" message and redirect to login on 401; avoid silent failure. Document behavior in README or audit.
- [ ] **USE-02**: Error messages — Form validation and API errors show inline or toast with clear, actionable text; no raw "Error" or stack. Confirm check-in and register flows.
- [ ] **USE-03**: Success feedback — After check-in, registration, or profile update, show clear success state (toast or inline) before redirect. Confirm with screen reader if possible.
- [ ] **USE-04**: Responsive tables — Rosters and any wide tables have horizontal scroll or card layout on small viewports; no overflow hidden without scroll.

## Acceptance criteria

- One h1 per page; heading levels in order. Skip link present and working.
- Modals trap focus and return; forms have proper labels and required indicators.
- Color contrast meets WCAG AA; touch targets ≥44px (or equivalent).
- Session/401 handling and error/success messaging documented and working.
- Tables are usable on mobile (scroll or cards).

## How to test

1. **axe**: Run `@axe-core/cli` or browser extension on dashboard, check-in, rosters — fix reported violations.
2. **Keyboard**: Tab through pages; no trap, focus visible; Enter/Space activate buttons and links.
3. **Screen reader**: Optional; spot-check form labels and success/error announcements.
4. **Lighthouse**: Accessibility score ≥90 on key pages; address remaining items.
5. **Mobile**: Resize to 375px; tap targets and tables usable; no horizontal overflow without scroll.
6. **Flows**: Trigger validation error, 401, and success path; confirm messages and redirects.
