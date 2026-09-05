# gatherKids — Comprehensive Application Audit Report

**Date**: March 15, 2026
**Application**: gatherKids — Children's Ministry Management System
**Stack**: Next.js 15.3.8, React 18.3, TypeScript 5.9, Tailwind CSS, Radix UI (shadcn), Supabase, TanStack React Query 4
> **Note**: Dexie (IndexedDB) and demo mode were removed at runtime. Leftover file cleanup is [#266](https://github.com/tzlukoma/gather-kids/issues/266) (supersedes [#191](https://github.com/tzlukoma/gather-kids/issues/191)). Findings marked ✅ were resolved by that runtime refactor.
**Methodology**: Vercel Web Interface Guidelines, Vercel React Best Practices (62 rules), Vercel Composition Patterns, WCAG 2.1 AA

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [UX & Design](#2-ux--design)
3. [Performance](#3-performance)
4. [Accessibility](#4-accessibility)
5. [Usability](#5-usability)
6. [Maintenance & Scalability](#6-maintenance--scalability)
7. [Prioritized Action Plan](#7-prioritized-action-plan)

---

## 1. Executive Summary

This audit identified **109 findings** across 5 categories. **6 are fully resolved by the demo mode runtime removal**, leaving **103 open findings**. Leftover Dexie deletion is [#266](https://github.com/tzlukoma/gather-kids/issues/266).

| Category | Critical | High | Major | Medium | Minor/Low | Total | Resolved by #191 |
|----------|----------|------|-------|--------|-----------|-------|------------------|
| UX & Design | 3 | 1 | — | 8 | 4 | 16 | — |
| Performance | 4 | 4 | — | 11 | 5 | 24 | 1 |
| Accessibility | 2 | — | 6 | — | 9 | 17 | — |
| Usability | — | — | 4 | — | 7 | 11 | — |
| Maintenance & Scalability | 5 | 11 | — | 20 | 14 | 50 | 5 |
| **Open Total** | **14** | **16** | **10** | **39** | **39** | **103** | **6** |

**Top 5 systemic issues:**

1. **No Server Components** — Every page uses `'use client'`, forfeiting RSC benefits (streaming, reduced JS, parallel server fetching)
2. **God Files** — `dal.ts` (4,781 lines), `register/page.tsx` (2,843 lines), `bible-bee-manage.tsx` (2,923 lines), `supabase-adapter.ts` (3,612 lines)
3. **Zero Error Boundaries** — No `error.tsx` at any route segment; a single component crash takes down the entire app
4. **Build Safety Disabled** — Both `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` are `true`
5. **Pervasive `any` Types** — 100+ `any` usages across data hooks, adapters, and the Bible Bee component

---

## 2. UX & Design

### 2.1 Visual Consistency

#### UX-01: Font Loading Redundancy & Mismatch
**Severity**: Medium
**Files**: `src/app/layout.tsx:27-35`, `src/app/globals.css:1`

Fonts are loaded twice: via `<link>` tags in the layout and via `@import` in `globals.css`. Additionally, `Source Sans Pro` is imported but never referenced by the active CSS variables — `--font-body` resolves to `Work Sans`. The Tailwind config defines three font families (`display`, `body`, `headline`) that all resolve to `Work Sans`, making the distinction meaningless.

**Recommendation**: Remove the `<link>` tags and `@import`. Switch to `next/font/google` for self-hosted, optimized loading. Define distinct font families or consolidate to one.

---

#### UX-02: `!important` Overrides in Global CSS
**Severity**: Low
**File**: `src/app/globals.css:146-156`

The `.font-headline`, `.font-body`, and `.font-scripture` utility classes use `!important`, noted as a workaround "until a full rebuild regenerates them". This creates specificity conflicts.

**Recommendation**: Remove `!important` overrides and trigger a full Tailwind rebuild.

---

#### UX-03: Hardcoded Year in Dashboard
**Severity**: Low
**File**: `src/app/dashboard/page.tsx:142`

The string `"Registrations (2025)"` is hardcoded rather than deriving from the active registration cycle.

**Recommendation**: Use the active cycle name dynamically.

---

#### UX-04: HTML Entity in JavaScript Strings
**Severity**: Critical (renders literal `&apos;` to users)
**Files**: `src/components/gatherKids/check-in-view.tsx:47`, `src/components/gatherKids/child-card.tsx:104`

```javascript
evt_childrens_church: 'Children&apos;s Church',
```

The HTML entity `&apos;` is in a JS string (not JSX), so it renders as literal text `Children&apos;s Church`.

**Recommendation**: Use a plain apostrophe: `'Children\'s Church'`

---

### 2.2 Layout & Responsiveness

#### UX-05: Dual Navigation Systems
**Severity**: Medium
**Files**: `src/app/dashboard/layout.tsx`, `src/components/gatherKids/dashboard-nav.tsx`

Two complete navigation implementations exist. The layout file is actually used; `dashboard-nav.tsx` appears to be legacy/unused code.

**Recommendation**: Delete the unused `dashboard-nav.tsx` or consolidate.

---

#### UX-06: Child Card Avatar Size Jump
**Severity**: Medium
**File**: `src/components/gatherKids/child-card.tsx:216`

```css
w-40 h-40 sm:w-[60px] sm:h-[60px]
```

The avatar is 160px on mobile and 60px on larger screens — a 2.7x reduction. The fallback icon mirrors this with `h-32 w-32 sm:h-8 sm:w-8`.

**Recommendation**: Use a more proportional responsive scale (e.g., `w-20 h-20 sm:w-[60px] sm:h-[60px]`).

---

#### UX-07: Dialog Content Missing Max Height
**Severity**: Medium
**File**: `src/components/ui/dialog.tsx:38-42`

`DialogContent` has no `max-h-[90vh]` or `overflow-y-auto`. Long dialog content (checkout, edit modals) overflows the viewport on smaller screens.

**Recommendation**: Add `max-h-[90vh] overflow-y-auto` to `DialogContent`.

---

#### UX-08: Registration Page Has No Shell
**Severity**: Medium
**File**: `src/app/register/page.tsx`

The registration page renders with no header, navigation, or footer. Users cannot navigate away without the browser back button.

**Recommendation**: Add a minimal header with the app logo and a "Back to Login" link.

---

### 2.3 Missing States

#### UX-09: Inconsistent Loading States
**Severity**: Critical
**Files**: `src/app/household/page.tsx:119`, `src/app/register/page.tsx:2839`

Two pages use bare `<div>Loading...</div>` while all others use proper skeleton components.

**Recommendation**: Replace with `GuardianSkeleton` and a proper registration skeleton.

---

#### UX-10: CardGridSkeleton Prop Mismatch
**Severity**: Critical (skeleton always shows 6 cards regardless of intent)
**Files**: `src/components/skeletons/CardGridSkeleton.tsx:4`, `src/app/dashboard/page.tsx:85`, `src/app/dashboard/check-in/page.tsx:167`

The component accepts `count` but callers pass `cards`. The mismatch is silently ignored.

**Recommendation**: Fix callers to use `count` or rename the prop.

---

#### UX-11: Household Error State Falls Through to Loading
**Severity**: Medium
**File**: `src/app/household/page.tsx`

If a React Query error occurs, `isLoading` is false and `profileData` is null. The page shows "Loading household..." forever because the condition `if (isLoading || !profileData)` catches both loading and error states.

**Recommendation**: Add an explicit error check before the loading check.

---

### 2.4 Dark Mode

#### UX-12: Dark Mode CSS Is Dead Code
**Severity**: Critical
**Files**: `tailwind.config.ts:4`, `src/app/layout.tsx:25`, `src/app/globals.css:70-110`

Tailwind is configured with `darkMode: ['class']`, and dark mode CSS variables are defined in `globals.css`, but no theme toggle or `next-themes` provider exists. The `.dark` class can never be applied.

**Recommendation**: Either remove the dark mode CSS variables (reducing CSS size) or add `next-themes` with a toggle.

---

#### UX-13: Hardcoded Colors Won't Adapt to Dark Mode
**Severity**: Medium
**Files**: Multiple (`child-card.tsx`, `household-profile.tsx`, `register/page.tsx`, `dashboard/layout.tsx`)

Colors like `bg-blue-100 text-blue-800`, `text-red-600`, `bg-gray-100` won't adapt to dark mode. They should use semantic design tokens.

**Recommendation**: Replace with theme-aware tokens (`bg-destructive`, `bg-muted`, etc.).

---

### 2.5 Visual Hierarchy & Navigation

#### UX-14: Check-In Page Title Hierarchy Inverted
**Severity**: Medium
**File**: `src/app/dashboard/check-in/page.tsx:174-186`

The `<h1>` is `text-xl text-muted-foreground` (small and muted), while the event name below is `text-3xl font-bold`. The secondary information visually dominates the primary heading.

**Recommendation**: Make the `<h1>` the most visually prominent element.

---

#### UX-15: Flat Feature Routes Incorrectly Nested Under `/dashboard`
**Severity**: High
**File**: `src/lib/navigation.ts`, `src/app/dashboard/`

The root issue here isn't missing breadcrumbs — it's a structural problem with the URL hierarchy. `/dashboard` currently serves two roles: a shared layout shell AND a named URL segment that every feature route is nested under:

```
/dashboard/check-in
/dashboard/rosters
/dashboard/incidents
/dashboard/registrations
/dashboard/leaders
/dashboard/ministries
/dashboard/bible-bee
/dashboard/branding
/dashboard/reports
/dashboard/users
```

These are all top-level features of the application, not sub-pages of a dashboard summary. The nesting implies a hierarchy that doesn't exist in the UX — check-in isn't conceptually "inside" the dashboard overview, it's a peer of it. This creates unnecessarily deep URLs, misrepresents the information architecture, and is what made breadcrumbs seem necessary in the first place.

**Recommendation**: Use Next.js App Router [route groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups) to apply the shared shell layout without adding a URL segment. A `(admin)` route group folder name is ignored in the URL:

```
src/app/
  (admin)/
    layout.tsx          ← sidebar shell + auth protection (no /admin in URL)
    dashboard/          ← /dashboard  (the overview/summary home page)
    check-in/           ← /check-in
    rosters/            ← /rosters
    incidents/          ← /incidents
    registrations/
      page.tsx          ← /registrations
      [householdId]/    ← /registrations/[householdId]
    leaders/
      page.tsx          ← /leaders
      [leaderId]/       ← /leaders/[leaderId]
      directory/        ← /leaders/directory
    ministries/         ← /ministries
    bible-bee/
      page.tsx          ← /bible-bee
      year/[id]/        ← /bible-bee/year/[id]
      child/[childId]/  ← /bible-bee/child/[childId]
    branding/           ← /branding
    reports/            ← /reports
    users/              ← /users
  (guardian)/
    layout.tsx          ← household shell (no /guardian in URL)
    household/          ← /household  (as-is, already clean)
    ...
```

Update `src/lib/navigation.ts` `href` values accordingly (e.g. `'/dashboard/check-in'` → `'/check-in'`).

**Benefits over adding breadcrumbs:**
- `/dashboard` becomes a semantically meaningful destination — the home/overview screen — not the parent of everything
- Feature URLs are cleaner and more bookmarkable as first-class routes
- Eliminates the false URL hierarchy that made breadcrumbs feel necessary
- Route groups allow different auth/layout rules per group without URL pollution
- Aligns URL structure with how users actually think about the app

---

## 3. Performance

### 3.1 CRITICAL: Bundle Size

#### PERF-01: Barrel File Imports
**Rule**: `bundle-barrel-imports`
**File**: `src/hooks/data/index.ts`

This barrel file re-exports hooks from 13 modules. All 26 consumer files import via the barrel, forcing the bundler to load all 13 sub-modules even when only 1-2 hooks are needed.

**Recommendation**: Replace barrel imports with direct module imports:
```typescript
// Before
import { useChildren, useAttendance } from '@/hooks/data';
// After
import { useChildren } from '@/hooks/data/children';
import { useAttendance } from '@/hooks/data/attendance';
```

---

#### PERF-02: Zero Dynamic Imports
**Rule**: `bundle-dynamic-imports`

Zero files use `next/dynamic`. Heavy components are statically imported:

| Component | Size | Usage |
|-----------|------|-------|
| `BibleBeeManage` | 2,924 lines | Single admin page |
| `PhotoCaptureDialog` | 350 lines | Camera APIs, on-demand only |
| recharts (`chart.tsx`) | Heavy | Few pages |
| `SettingsModal` | — | On-demand only |

> `FeatureFlagDialog` was previously listed here but is removed by issue #191 (was only shown when `showDemoFeatures` was true).

**Recommendation**: Use `next/dynamic` with loading fallbacks for all modals, dialogs, and heavy components.

---

#### ✅ PERF-03: Both Database Adapters Loaded Statically — *Resolved by issue #191*
**Rule**: `bundle-conditional`
**File**: `src/lib/database/factory.ts:1-2`

Both `SupabaseAdapter` (3,500+ lines) and `IndexedDBAdapter` (1,800 lines) were imported statically, but only one was ever used at runtime.

**Resolution**: Runtime always uses `SupabaseAdapter`. Leftover `IndexedDBAdapter` / Dexie deletion is [#266](https://github.com/tzlukoma/gather-kids/issues/266) (supersedes #191).

---

#### PERF-04: ReactQueryDevtools in Production Bundle
**Rule**: `bundle-defer-third-party`
**File**: `src/lib/queryClient.tsx:4,23`

`ReactQueryDevtools` is statically imported and unconditionally rendered.

**Recommendation**: Dynamically import and gate behind `process.env.NODE_ENV === 'development'`.

---

### 3.2 CRITICAL: Eliminating Waterfalls

#### PERF-05: Sequential Fetches in Rosters
**Rule**: `async-parallel`
**File**: `src/app/dashboard/rosters/page.tsx:188-245`

`getMinistries(true)` has no dependency on the registration cycle but is blocked behind the cycle fetch.

**Recommendation**: Start both fetches in parallel with `Promise.all`.

---

#### PERF-06: Zero Suspense Boundaries in Dashboard
**Rule**: `async-suspense-boundaries`

The dashboard loads 3 independent queries but shows `CardGridSkeleton` until ALL complete. If one is slow, no data is visible.

**Recommendation**: Split into per-section components with individual loading states.

---

### 3.3 HIGH: Server & API Performance

#### PERF-07: Google Fonts via External `<link>`
**Rule**: `server-hoist-static-io`
**File**: `src/app/layout.tsx:27-36`

External Google Fonts links create render-blocking network requests.

**Recommendation**: Switch to `next/font/google` for self-hosted, zero-CLS font loading.

---

#### PERF-08: Entire App Is Client-Rendered
**Rule**: `server-parallel-fetching`

Every page and layout uses `'use client'`. Zero RSC benefits: no server-side data fetching, no streaming, full React runtime on every page, no `React.cache()`.

**Recommendation**: Incremental migration starting with `dashboard/layout.tsx` as a server component with small client islands for interactive elements.

---

#### PERF-09: Sequential Auth + Body Parsing in API Routes
**Rule**: `async-api-routes`
**File**: `src/app/api/users/route.ts:61-77`

`requireAdmin()` and `request.json()` are independent operations awaited sequentially.

**Recommendation**: Use `Promise.all` to parallelize.

---

### 3.4 MEDIUM: Re-render Optimization

#### PERF-10: `isAuthorized` useState + useEffect Anti-Pattern (10 pages)
**Rule**: `rerender-derived-state-no-effect`
**Files**: `src/app/dashboard/page.tsx` + 9 other dashboard pages

Every dashboard page stores `isAuthorized` in `useState` and computes it via `useEffect`, causing an extra render cycle. Authorization is purely derived from `user` and `loading`.

**Recommendation**: Replace all 10 occurrences with:
```typescript
const isAuthorized = !loading && !!user && user.metadata?.role === AuthRole.ADMIN;
```

---

#### PERF-11: Derived State via useEffect in Check-In View
**Rule**: `rerender-derived-state-no-effect`
**File**: `src/components/gatherKids/check-in-view.tsx:70,105-189`

`enrichedChildren` is computed from pure inputs via `useState` + `useEffect` (75 lines of derivation), causing an extra render cycle.

**Recommendation**: Replace with `useMemo`.

---

#### PERF-12: Inline Component Definitions
**Rule**: `rerender-no-inline-components`
**Files**: `src/app/dashboard/check-in/page.tsx:115`, `src/app/dashboard/rosters/page.tsx:629,836`

`FilterControls` is defined as an arrow function inside `CheckInContent` and rendered as `<FilterControls />`. React unmounts/remounts it on every parent render, destroying DOM nodes.

**Recommendation**: Extract to standalone components outside the parent.

---

#### PERF-13: Non-Primitive Default Values in Destructuring
**Rule**: `rerender-memo-with-default-value`
**Files**: `dashboard/page.tsx`, `check-in/page.tsx`, `rosters/page.tsx`, `check-in-view.tsx`

Inline `= []` and `= { ... }` in React Query destructuring creates new references on every render.

**Recommendation**: Hoist defaults to module-level constants.

---

#### PERF-14: Missing Lazy State Initialization
**Rule**: `rerender-lazy-state-init`
**Files**: `rosters/page.tsx:149-151`, `check-in/page.tsx:53`

`useState<Set<string>>(new Set())` creates a new Set on every render.

**Recommendation**: Use `useState<Set<string>>(() => new Set())`.

---

### 3.5 MEDIUM: Rendering Performance

#### PERF-15: Long Lists Without Virtualization
**Rule**: `rendering-content-visibility`
**Files**: `rosters/page.tsx`, `check-in-view.tsx`

The roster table and check-in grid render all items at once. For 200+ children, this means 200+ DOM nodes.

**Recommendation**: Add `content-visibility: auto` for moderate lists; `@tanstack/react-virtual` for 500+.

---

#### PERF-16: Native `<img>` Instead of `next/image`
**Files**: `photo-viewer-dialog.tsx:20`, `dashboard/layout.tsx:157-163`

Native `<img>` tags miss automatic lazy loading, responsive srcset, and WebP/AVIF conversion.

**Recommendation**: Migrate to `next/image`. Add Supabase storage domain to `next.config.ts` `images.remotePatterns`.

---

#### PERF-17: Inefficient Set/Map Lookups
**Rule**: `js-set-map-lookups`
**Files**: `rosters/page.tsx:361-367`, `check-in-view.tsx:130-141`

A new `Set` is created inside `.filter()` for every element (O(n*m)). Three separate `Array.includes()` filter passes use O(n) per lookup.

**Recommendation**: Build Sets/Maps once before iterating.

---

#### PERF-18: Console.log Statements Ship to Production
**Files**: Heaviest in `supabase-adapter.ts` (66), `auth-context.tsx` (38), `dal.ts` (81 — reduced significantly by issue #191 which removes ~144 demo/Dexie branches)

> **Impact of issue #191**: `shouldUseAdapter()` (called on every DAL invocation) is deleted, the factory's demo-mode logging is removed, and demo branches in `auth-context.tsx` and `dal.ts` are stripped. Total console statement count will drop substantially — exact count to be re-audited post-refactor.

**Recommendation**: Strip via build-time transform (`terser` `drop_console`) or gate behind a debug utility.

---

## 4. Accessibility

### 4.1 Critical

#### A11Y-01: No Skip-to-Content Link
**WCAG**: 2.4.1 Bypass Blocks (Level A)
**Files**: `src/app/layout.tsx:38`, `src/app/dashboard/layout.tsx:263`, `src/app/household/layout.tsx:241`

No skip navigation link exists. Keyboard users must tab through 6+ sidebar items on every page.

**Recommendation**: Add a visually-hidden skip link as the first element inside `<body>`:
```html
<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to main content</a>
```
Add `id="main-content"` to each layout's `<main>` tag.

---

#### A11Y-02: No Global Focus-Visible Styles
**WCAG**: 2.4.7 Focus Visible (Level AA)
**File**: `src/app/globals.css`

The global stylesheet has zero focus-visible rules. Many interactive elements (sidebar links, footer links) have no visible focus indicator.

**Recommendation**: Add a global rule:
```css
@layer base {
  *:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
    border-radius: 2px;
  }
}
```

---

### 4.2 Major

#### A11Y-03: Login Page Fields Not in a `<form>` Element
**WCAG**: 1.3.1 Info and Relationships (A), 4.1.2 Name, Role, Value (A)
**File**: `src/app/login/page.tsx:465-526`

Email/password fields and the submit button are in a `<CardContent>` div, not a `<form>`. Screen readers won't identify it as a form. Password managers may not detect it. Enter key doesn't submit.

**Recommendation**: Wrap in a `<form>` with `onSubmit`. Same issue at `src/app/create-account/page.tsx:481-520`.

---

#### A11Y-04: Registration Email Input Has No Label
**WCAG**: 1.3.1 Info and Relationships (A), 4.1.2 Name, Role, Value (A)
**File**: `src/app/register/page.tsx:1621-1626`

The email lookup input has no `<label>`, `aria-label`, or `aria-labelledby` — only a `placeholder`.

**Recommendation**: Add `<Label htmlFor="lookup-email">` or `aria-label="Household email address"`.

---

#### A11Y-05: Brand Teal Fails AA Contrast
**WCAG**: 1.4.3 Contrast Minimum (Level AA)
**File**: `src/app/globals.css:14-15,38-39`

`#017C7D` on white = ~4.08:1. AA requires 4.5:1 for normal text. Every primary button (white text on teal) fails.

**Recommendation**: Darken to `#016B6C` (4.7:1) or `#016060` (5.1:1).

---

#### A11Y-06: Yellow Background Has Catastrophic Contrast on White
**WCAG**: 1.4.3 Contrast Minimum (Level AA)
**File**: `src/app/globals.css:16,40-41`

`#FCB131` on white = ~1.85:1. While `secondary` buttons correctly use dark text on yellow, any accidental use of yellow as text on light backgrounds would be invisible.

**Recommendation**: Audit all usages. Enforce dark foreground on yellow backgrounds.

---

#### A11Y-07: Toasts Not Announced to Screen Readers
**WCAG**: 4.1.3 Status Messages (Level AA)
**File**: `src/components/ui/toaster.tsx:13-35`

Radix Toast defaults to `aria-live="off"`. Toasts are the primary feedback mechanism across the app but are silent to screen readers.

**Recommendation**: Override `ToastViewport` with `aria-label="Notifications"` and appropriate `aria-live`.

---

#### A11Y-08: Form Errors Not Linked to Inputs in Edit Child Modal
**WCAG**: 1.3.1 Info and Relationships (A), 3.3.1 Error Identification (A)
**File**: `src/components/gatherKids/edit-child-modal.tsx:163-234`

Uses manual `register()` with standalone `<p>` error messages. No `aria-describedby`, no `aria-invalid`.

**Recommendation**: Refactor to use `FormField`/`FormControl`/`FormMessage` (which already handles this correctly).

---

#### A11Y-09: Dynamic Content Updates Not Announced
**WCAG**: 4.1.3 Status Messages (Level AA)
**Files**: `check-in/page.tsx:225-236`, `rosters/page.tsx:823-831`

Check-in counts, status changes, and filter results update without `aria-live` regions.

**Recommendation**: Add `aria-live="polite"` to the check-in counter and filtered results container.

---

### 4.3 Minor

#### A11Y-10: Password Visibility Toggles Missing Accessible Labels
**Files**: `login/page.tsx:489-501`, `onboarding/page.tsx:351-362`

Icon-only buttons with no `aria-label`.

**Recommendation**: Add `aria-label={showPassword ? "Hide password" : "Show password"}`.

---

#### A11Y-11: Decorative Icons Lack `aria-hidden`
**Files**: Dashboard/household layout dropdown menus

Lucide icons alongside text labels may be announced by screen readers.

**Recommendation**: Add `aria-hidden="true"` to decorative icons.

---

#### A11Y-12: Heading Hierarchy Inconsistencies
**Files**: `check-in/page.tsx:175`, `rosters/page.tsx:894`

`<h1>` is visually smaller than subsequent content. Card titles jump levels.

**Recommendation**: Ensure `<h1>` is the most prominent element; use `<h2>` for sections.

---

#### A11Y-13: `global-error.tsx` Missing `lang="en"`
**File**: `src/app/global-error.tsx:13`

The error page renders its own `<html>` without `lang` attribute.

**Recommendation**: Add `lang="en"`.

---

#### A11Y-14: SidebarTrigger Missing `aria-expanded`
**Files**: Dashboard/household layouts

The sidebar toggle doesn't communicate open/closed state to assistive technology.

**Recommendation**: Add `aria-expanded={open}` to `SidebarTrigger`.

---

#### A11Y-15: Required Consent Checkboxes Not Marked Required
**File**: `src/app/register/page.tsx:2695-2740`

No visual or programmatic `required` indication on mandatory consent checkboxes.

**Recommendation**: Add asterisks and `aria-required="true"`.

---

#### A11Y-16: Small Touch Targets on Checkboxes
**WCAG**: 2.5.8 Target Size Minimum (AA)
**Files**: Registration form, rosters page

Checkboxes render at ~16x16px, below the 24x24px minimum.

**Recommendation**: Expand clickable area with padding wrappers.

---

#### A11Y-17: `muted-foreground` on `muted` Background ~3.7:1
**WCAG**: 1.4.3 Contrast Minimum (AA)
**File**: `src/app/globals.css:42-44`

`#577580` on `#E8E2D9` = ~3.7:1 (AA requires 4.5:1).

**Recommendation**: Darken `--muted-foreground` to `#4A6570`.

---

## 5. Usability

### 5.1 Major

#### USE-01: No Error Boundaries at Any Route Segment
**Files**: `src/app/` (zero `error.tsx` files)

Only `global-error.tsx` exists. A component crash in any page takes down the entire app with a generic error screen, no navigation, and no recovery.

**Recommendation**: Add `error.tsx` to `dashboard/`, `household/`, `register/`, `auth/` with branded recovery UI.

---

#### USE-02: Enter Key Doesn't Submit Login Form
**File**: `src/app/login/page.tsx:465-526`

Because fields aren't in a `<form>`, Enter doesn't submit. Same issue at `create-account/page.tsx`.

**Recommendation**: Wrap in `<form>` with `onSubmit` handler.

---

#### USE-03: Registration Form Doesn't Scroll to First Error
**File**: `src/app/register/page.tsx:1791-1799`

On validation failure, errors only log to console. No visible feedback, no scroll-to-error, no toast. On a 2,843-line form, users may not find the error.

**Recommendation**: Add scroll-to-first-error, focus the invalid field, and show a destructive toast.

---

#### USE-04: Household Layout Redirect Shows Blank Screen
**File**: `src/app/household/layout.tsx:330-342`

When redirecting unauthorized users, `setTimeout(() => router.push('/register'), 100)` fires while the component returns `null`, showing a blank screen.

**Recommendation**: Show a loading/redirecting indicator instead of `null`.

---

### 5.2 Minor

#### USE-05: Debug UI Visible in Production
**File**: `src/app/onboarding/page.tsx:392-402`

"Show Debug Info" toggle is visible to all users in all environments.

**Recommendation**: Gate behind `process.env.NODE_ENV !== 'production'`.

---

#### USE-06: Unauthorized Page "Go to Dashboard" Loop Risk
**File**: `src/app/unauthorized/page.tsx:66-71`

If the user was redirected FROM the dashboard, "Go to Dashboard" sends them back into a redirect loop.

**Recommendation**: Link to `/` or make destination role-dependent.

---

#### USE-07: No Password Strength Indicator
**Files**: `create-account/page.tsx:493-502`, `onboarding/page.tsx`

6-character minimum with no strength feedback.

**Recommendation**: Add real-time password strength indicator. Consider increasing minimum to 8.

---

#### USE-08: Inconsistent Confirmation Dialogs for Destructive Actions
**File**: `src/app/register/page.tsx:2394-2437`

Removing an existing child shows a confirmation dialog, but removing a newly added child (with data) does not. Bulk check-out on rosters has no confirmation.

**Recommendation**: Add confirmation for all destructive actions.

---

#### USE-09: Skeletons Lack Accessible Loading Indication
**Files**: `src/components/skeletons/*.tsx`

No `role="status"`, `aria-busy`, or `sr-only` text on skeleton components.

**Recommendation**: Add `role="status" aria-label="Loading"` and `<span className="sr-only">Loading...</span>`.

---

#### USE-10: Empty State Missing in Registration Children Section
**File**: `src/app/register/page.tsx:2156-2165`

When no children are added, the accordion renders empty with no guidance.

**Recommendation**: Show a prominent empty state explaining what to do next.

---

#### USE-11: Excessive Console Logging in Production
**Files**: `register/page.tsx` (~100), `household/layout.tsx` (~15), `rosters/page.tsx` (~10)

Debug logs with `🔍` prefixes ship to production, exposing internals in DevTools.

**Recommendation**: Gate behind debug utility or strip via build transform.

---

## 6. Maintenance & Scalability

### 6.1 Build & Configuration

#### MAINT-01: TypeScript Build Errors Suppressed
**Severity**: Critical
**File**: `next.config.ts:9-11`

`typescript.ignoreBuildErrors: true` allows type-unsafe code to ship to production.

**Recommendation**: Set to `false`. Run `npx tsc --noEmit` and fix errors. Add to CI.

---

#### MAINT-02: ESLint Suppressed During Builds
**Severity**: Critical
**File**: `next.config.ts:12-14`

`eslint.ignoreDuringBuilds: true` bypasses accessibility, React hook, and security lint rules.

**Recommendation**: Set to `false`. Run `npx next lint` and resolve violations.

---

### 6.2 Component Architecture

#### MAINT-03: God File — `bible-bee-manage.tsx` (2,923 lines)
**Severity**: High
**Rule**: `architecture-compound-components`
**File**: `src/components/gatherKids/bible-bee-manage.tsx`

Contains 6 private sub-components averaging 400-500 lines each. Uses `useState<any[]>` + `useEffect` instead of existing React Query hooks. Has 51 console statements and 44 `any` usages.

**Recommendation**: Refactor into a compound component directory with shared context. Use existing React Query hooks. Apply proper types.

---

#### MAINT-04: God File — `register/page.tsx` (2,843 lines)
**Severity**: High
**File**: `src/app/register/page.tsx`

A single file containing the entire multi-step form, validation schemas, field arrays, ministry logic, consent handling, and submission.

> **Impact of issue #191**: Removing `isDemoMode` branches and demo-only email verification bypasses will trim some lines, but the file remains large. Split is still required.

**Recommendation**: Split into step components (`HouseholdInfoStep`, `ChildrenStep`, `MinistryEnrollmentStep`, `ConsentStep`), shared schemas, and types.

---

#### MAINT-05: God File — `dal.ts` (4,781 lines)
**Severity**: Critical
**File**: `src/lib/dal.ts`

Every data access function for the entire app in one file.

> **Impact of issue #191**: ~144 references to demo/legacy Dexie branches are removed, along with `shouldUseAdapter()` and its call sites. This will meaningfully reduce the file size before the split. **Recommend completing issue #191 before attempting the domain split**, as many lines to be removed are interleaved with the legitimate DAL code.

**Recommendation**: Split into domain modules: `dal/households.ts`, `dal/children.ts`, `dal/attendance.ts`, etc.

---

#### MAINT-06: God File — `supabase-adapter.ts` (3,612 lines)
**Severity**: Medium
**File**: `src/lib/database/supabase-adapter.ts`

**Recommendation**: Split into domain-specific mixins or use code generation for repetitive CRUD patterns.

---

#### MAINT-07: Boolean Props Instead of Explicit Variants
**Rule**: `patterns-explicit-variants`
**File**: `src/components/gatherKids/ministry-form-dialog.tsx`

Uses `isEditing` boolean to switch between create and edit modes.

**Recommendation**: Create `<MinistryCreateDialog>` and `<MinistryEditDialog>` sharing a common `<MinistryForm>`.

---

### 6.3 State Management

#### MAINT-08: Duplicate AuthProvider in Dashboard Layout
**Severity**: High
**File**: `src/app/dashboard/layout.tsx:287`

`DashboardLayout` wraps children in a second `<AuthProvider>`, creating a nested duplicate that shadows the root provider.

**Recommendation**: Remove the inner `<AuthProvider>`.

---

#### MAINT-09: Ministry Access Logic Duplicated in Auth Context
**Severity**: High
**File**: `src/contexts/auth-context.tsx` (lines 44-134, 173-209, 269-307, 372-403, 560-599)

The same ~30-line pattern is implemented 5 times. A helper function exists but is only used in 2 of the 5 places.

> **Impact of issue #191**: The instance at lines 173-209 is the demo localStorage initialization path and will be deleted. Post-refactor this drops from 5 to 4 duplicate instances. Still needs consolidation.

**Recommendation**: Consolidate into the existing `checkAndUpdateMinistryAccess` helper.

---

#### MAINT-10: Inconsistent React Query Key Patterns
**Severity**: Medium
**Files**: `src/hooks/data/attendance.ts`, `src/hooks/data/children.ts`

Some mutations use the `queryKeys` factory, others use raw string arrays. Sibling mutations (`useCheckInMutation` vs `useCheckOutMutation`) use different key patterns for the same entity.

**Recommendation**: Standardize all query keys through the `queryKeys` factory in `src/hooks/data/keys.ts`.

---

#### MAINT-11: User Object as React Query Key
**Severity**: Medium
**File**: `src/hooks/data/attendance.ts:34-41`

`queryKey: ['incidents', 'user', user]` — the entire user object triggers refetches on any reference change.

**Recommendation**: Use `user?.uid` as the key instead.

---

### 6.4 Data Layer

#### ✅ MAINT-12: Direct Dexie Imports Bypass Adapter Pattern — *Resolved by issue #191*
**Severity**: High
**Files**: 9+ files import `@/lib/db` directly

Components and utilities bypass the database adapter by importing the raw Dexie instance, breaking silently in Supabase/production mode.

**Resolution**: Runtime no longer uses Dexie. Leftover `@/lib/db` imports and `src/lib/db.ts` deletion are [#266](https://github.com/tzlukoma/gather-kids/issues/266).

---

#### ✅ MAINT-13: `dal.ts` Imports Both Dexie and Adapter — *Resolved by issue #191*
**Severity**: High
**File**: `src/lib/dal.ts:15-16`

```typescript
import { db } from './db';
import { db as dbAdapter } from './database/factory';
```

Many functions used `db` (Dexie) directly, only working in demo mode.

**Resolution**: Runtime path is the adapter. Leftover Dexie helpers in `dal.ts` are [#266](https://github.com/tzlukoma/gather-kids/issues/266).

---

#### MAINT-14: No Server-Side Input Validation
**Severity**: High
**Files**: All API routes (`src/app/api/users/`, etc.)

API endpoints accept request bodies without Zod validation. Client-side validation exists but can be bypassed.

**Recommendation**: Add Zod schemas for all API request bodies. Return 400 with structured errors on failure.

---

#### MAINT-15: `any` in Database Adapter Interface
**Severity**: Medium
**File**: `src/lib/database/types.ts:317-318, 372-374, 377-378`

Business-logic operations with untyped signatures: `commitEnhancedCsvRowsToYear(rows: any[], ...)`, `getDraft(... ): Promise<any>`, `previewAutoEnrollment(... ): Promise<any>`.

**Recommendation**: Define proper input/output types. Move business logic operations off the generic adapter interface.

---

#### ✅ MAINT-16: `require()` in Factory (ESM Project) — *Resolved by issue #191*
**Severity**: Medium
**File**: `src/lib/database/factory.ts:48,55,60`

Uses `require()` for dynamic imports in an ESM project, preventing tree-shaking.

**Resolution**: Factory always instantiates `SupabaseAdapter`. Leftover IndexedDB adapter file deletion is #266.

---

### 6.5 Type Safety

#### MAINT-17: 90+ `any` Usages Across Core Files
**Severity**: Critical (aggregate)

| File | `any` Count | Status |
|------|-------------|--------|
| `bible-bee-manage.tsx` | 44 | Needs fixing |
| `supabase-adapter.ts` | 18 | Needs fixing |
| `hooks/data/bibleBee.ts` | 15 | Needs fixing |
| ~~`indexed-db-adapter.ts`~~ | ~~13~~ | ✅ Deleted by issue #191 |
| `dal.ts` | 11 (reduced post-#191) | Needs fixing |
| `auth-context.tsx` | 1 (`getUserId(u: any)`) | Needs fixing |

> **Impact of issue #191**: `indexed-db-adapter.ts` is deleted entirely (-13 `any`). Some of the 11 in `dal.ts` are in demo branches that will also be removed. Post-refactor count will be ~89 or fewer.

**Recommendation**: Replace with domain types from `src/lib/types.ts`. Use `unknown` for catch blocks. Add explicit generics to React Query hooks.

---

### 6.6 Code Duplication

#### MAINT-18: `isActiveValue` Defined in 3 Locations
**Files**: `dal.ts:59-61`, `bible-bee-manage.tsx:101-103`, `bible-bee-manage.tsx:~2566`

Identical helper function.

**Recommendation**: Export from `src/lib/utils.ts`.

---

#### MAINT-19: `renderIcon` Copy-Pasted 3 Times
**Files**: `dashboard/layout.tsx:75-92`, `household/layout.tsx:126-134`, `dashboard-nav.tsx:46-54`

Three variants of the same icon rendering helper.

**Recommendation**: Extract to a shared utility.

---

#### MAINT-20: Event Name Mapping Defined 3 Times
**Files**: `check-in-view.tsx:44-52`, `child-card.tsx:101-109`, `check-in/page.tsx:41-45`

**Recommendation**: Define once in a shared constants file.

---

#### MAINT-21: Household ID Resolution Duplicated
**Files**: `household/page.tsx:44-99`, `household/layout.tsx:46-96`

Both independently resolve the household ID, creating redundant API calls and potential race conditions.

**Recommendation**: Resolve once in the layout and pass to pages via context or params.

---

### 6.7 Dependencies

#### MAINT-22: Deprecated `@supabase/auth-helpers-nextjs`
**Severity**: High
**File**: `package.json:89`

Deprecated in favor of `@supabase/ssr` (which is also installed).

**Recommendation**: Remove `@supabase/auth-helpers-nextjs`. Migrate remaining usages to `@supabase/ssr`.

---

#### MAINT-23: React Query v4 (Legacy)
**Severity**: Medium
**File**: `package.json:91`

TanStack Query v5 has been stable for over a year with improved types and smaller bundle.

**Recommendation**: Plan migration to v5.

---

### 6.8 Testing

#### MAINT-24: Check-In/Check-Out Flow Untested
**Severity**: Medium

The core user journey has zero dedicated test coverage.

**Recommendation**: Add unit tests for mutations and component tests for `CheckInView`.

---

#### MAINT-25: No `loading.tsx` Files
**Severity**: High

Zero `loading.tsx` files at any route segment. Route transitions show no indicators.

**Recommendation**: Add `loading.tsx` to `dashboard/`, `household/`, `register/` using existing skeleton components.

---

### 6.9 Security

#### ✅ MAINT-26: `shouldUseAdapter()` Logs Architecture Details — *Resolved by issue #191*
**Severity**: High
**File**: `src/lib/dal.ts:48-55`

Logged database mode and environment variable state to the browser console on every DAL call — potentially hundreds of times per session.

**Resolution**: Runtime is a single Supabase path. Leftover `shouldUseAdapter()` stubs are #266.

---

#### ✅ MAINT-27: `ProtectedRoute` Potential Infinite Reload Loop — *Resolved by issue #191*
**Severity**: Medium
**File**: `src/components/auth/protected-route.tsx:55-57`

`window.location.reload()` fired when a demo user existed in localStorage but auth context didn't pick it up, with no reload counter to prevent looping.

**Resolution**: Demo localStorage auth is gone. Leftover comments/stubs: #266.

---

#### MAINT-28: Browser `alert()` / `confirm()` in Bible Bee Component
**Severity**: Medium
**File**: `src/components/gatherKids/bible-bee-manage.tsx:475-478, 482-484, 718-719, 1081`

Uses blocking, non-accessible, untestable browser dialogs.

**Recommendation**: Replace with the existing toast and `ConfirmationDialog` components.

---

## 7. Prioritized Action Plan

### Phase 1: Quick Wins (< 1 day, immediate impact)

| # | Finding | Time | Impact |
|---|---------|------|--------|
| 1 | Fix `&apos;` in JS strings (UX-04) | 5 min | Fixes visible bug |
| 2 | Fix `CardGridSkeleton` prop mismatch (UX-10) | 5 min | Fixes visible bug |
| 3 | Wrap login/create-account in `<form>` (A11Y-03, USE-02) | 15 min | Fixes a11y + usability |
| 4 | Add skip-to-content link (A11Y-01) | 10 min | WCAG A compliance |
| 5 | Add global focus-visible styles (A11Y-02) | 5 min | WCAG AA compliance |
| 6 | Add `lang="en"` to global-error.tsx (A11Y-13) | 1 min | WCAG A compliance |
| 7 | Dynamically import ReactQueryDevtools (PERF-04) | 5 min | Bundle reduction |
| 8 | Convert `isAuthorized` to derived const (PERF-10) | 20 min | Eliminates 10 extra renders |
| 9 | Add `aria-label` to password toggles (A11Y-10) | 5 min | WCAG A compliance |
| 10 | Remove duplicate `AuthProvider` (MAINT-08) | 5 min | Fixes state bug |
| 11 | Use lazy state init for Sets (PERF-14) | 2 min | Minor perf |
| 12 | Parallelize roster fetches (PERF-05) | 10 min | Eliminates waterfall |

**Phase 1 Total**: ~88 minutes for 12 high-impact fixes

---

### Phase 2: Medium Effort (1-3 days)

| # | Finding | Time | Impact |
|---|---------|------|--------|
| 1 | Switch to `next/font/google` (PERF-07) | 30 min | Eliminates render-blocking requests |
| 2 | Replace barrel imports with direct (PERF-01) | 1 hr | Significant bundle reduction |
| 3 | Add `next/dynamic` to top 7 heavy components (PERF-02) | 2 hrs | Major bundle reduction |
| 4 | Add `error.tsx` to 4 route segments (USE-01) | 1 hr | Prevents total crashes |
| 5 | Add `loading.tsx` to 3 route segments (MAINT-25) | 30 min | Smooth route transitions |
| 6 | Convert enrichedChildren to useMemo (PERF-11) | 30 min | Removes extra render cycle |
| 7 | Extract inline components (PERF-12) | 1 hr | Fixes DOM thrashing |
| 8 | Darken brand teal for AA contrast (A11Y-05) | 30 min | WCAG AA compliance |
| 9 | Add scroll-to-error on registration (USE-03) | 30 min | Major UX improvement |
| 10 | Add Zod validation to API routes (MAINT-14) | 2 hrs | Security |
| 11 | Remove deprecated `@supabase/auth-helpers-nextjs` (MAINT-22) | 1 hr | Dependency cleanup |
| 12 | Add `aria-live` regions for dynamic content (A11Y-09) | 1 hr | WCAG AA compliance |
| 13 | Fix toast screen reader announcement (A11Y-07) | 30 min | WCAG AA compliance |

**Phase 2 Total**: ~12 hours

---

### Phase 3: Architectural (1-2 weeks)

| # | Finding | Time | Impact |
|---|---------|------|--------|
| 1 | Enable `ignoreBuildErrors: false`, fix all TS errors (MAINT-01) | 2-3 days | Build safety |
| 2 | Enable `ignoreDuringBuilds: false`, fix lint (MAINT-02) | 1-2 days | Code quality |
| 3 | Split `dal.ts` into domain modules (MAINT-05) | 2 days | Maintainability |
| 4 | Split `register/page.tsx` into step components (MAINT-04) | 2 days | Maintainability |
| 5 | Refactor `bible-bee-manage.tsx` into compound components (MAINT-03) | 2 days | Maintainability |
| ~~6~~ | ~~Conditional database adapter loading (PERF-03)~~ | — | ✅ Resolved by issue #191 |
| 7 | Strip console.log from production (PERF-18) — re-audit count after #191 | 4 hrs | Performance + security |
| 8 | Consolidate ministry access logic (MAINT-09) — drops from 5 to 4 instances after #191 | 2 hrs | DRY |
| 9 | Replace `any` types in Bible Bee component (MAINT-17) | 1 day | Type safety |
| 10 | Standardize React Query key patterns (MAINT-10) | 4 hrs | Cache reliability |

---

### Phase 4: Strategic (Ongoing)

| # | Finding | Impact |
|---|---------|--------|
| 1 | Begin RSC migration for dashboard layout (PERF-08) | Streaming, reduced JS |
| 2 | Add Suspense boundaries per data section (PERF-06) | Progressive loading |
| 3 | Implement dark mode with `next-themes` (UX-12) | User preference |
| 4 | Upgrade to TanStack Query v5 (MAINT-23) | Better types, smaller bundle |
| 5 | Add virtualization for long lists (PERF-15) | Scale to 500+ children |
| 6 | Restructure routes using `(admin)` route group; flatten `/dashboard/*` to top-level (UX-15) | URL clarity, correct information architecture |
| 7 | Expand E2E test coverage (MAINT-24) | Confidence in changes |
| 8 | Add `content-visibility` for off-screen content (PERF-15) | Paint performance |

---

## Recommended implementation sequence

Use the GitHub issues below in this order to minimize conflicts and to use the audit as a checklist. Complete each wave (or issue) before moving to the next; Wave 3 is the existing demo-mode removal issue (#191).

| Order | Wave | GitHub issue | Title / scope | Status |
|-------|------|--------------|----------------|--------|
| 1 | 1 | [#196](https://github.com/tzlukoma/gather-kids/issues/196) | Wave 1: Audit quick wins (isolated fixes) | ☐ |
| 2 | 2 | [#197](https://github.com/tzlukoma/gather-kids/issues/197) | Wave 2: ESLint safety net | ☐ |
| 3 | 3 | [#191](https://github.com/tzlukoma/gather-kids/issues/191) | Remove Demo Mode Refactor | ☐ |
| 4 | 4 | [#198](https://github.com/tzlukoma/gather-kids/issues/198) | Wave 4: Auth and state stabilization | ☐ |
| 5 | 5 | [#199](https://github.com/tzlukoma/gather-kids/issues/199) | Wave 5: Data layer cleanup | ☐ |
| 6 | 6 | [#200](https://github.com/tzlukoma/gather-kids/issues/200) | Wave 6: Component architecture (skeletons, empty states, modals) | ☐ |
| 7 | 7 | [#201](https://github.com/tzlukoma/gather-kids/issues/201) | Wave 7: TypeScript strict safety net | ☐ |
| 8 | 8 | [#202](https://github.com/tzlukoma/gather-kids/issues/202) | Wave 8: Route restructure — flat (admin) routes (UX-15) | ☐ |
| 9 | 9 | [#203](https://github.com/tzlukoma/gather-kids/issues/203) | Wave 9: Route error and loading infrastructure | ☐ |
| 10 | 10 | [#204](https://github.com/tzlukoma/gather-kids/issues/204) | Wave 10: Bundle optimization | ☐ |
| 11 | 11 | [#205](https://github.com/tzlukoma/gather-kids/issues/205) | Wave 11: Accessibility and usability polish | ☐ |
| 12 | 12 | [#206](https://github.com/tzlukoma/gather-kids/issues/206) | Wave 12: Strategic and ongoing (monitoring, docs, tech debt) | ☐ |

*Update the Status column (e.g. ☐ → ✅ or "In progress") as you complete each issue.*

---

## Appendix: Positive Findings

The audit also identified several well-implemented patterns worth preserving and extending:

1. **Skeleton loading components** exist for all major layouts (admin, guardian, cards, roster, Bible Bee)
2. **Toast feedback system** is comprehensive and consistent across all operations
3. **Mobile responsiveness** is thoughtfully implemented (table-to-card switches, bottom Sheet for filters)
4. **Confirmation dialogs** exist for destructive operations on existing data
5. **React Hook Form + Zod** integration on the client is well-structured
6. **Database adapter pattern** provides a clean abstraction layer between the DAL and Supabase *(note: IndexedDB side of this is removed by issue #191; the pattern itself is worth preserving for future adapter needs)*
7. **Feature flag system** enables safe rollout of new features *(note: `DATABASE_MODE` and `SHOW_DEMO_FEATURES` are gone; leftover cleanup is #266; remaining flags such as `loginMagicEnabled` and `registrationDraftPersistenceEnabled` continue)*
8. **Sentry integration** provides production error monitoring
9. **Comprehensive type definitions** in `src/lib/types.ts` cover all domain entities
10. **Test infrastructure** is in place with Jest, React Testing Library, and Playwright
