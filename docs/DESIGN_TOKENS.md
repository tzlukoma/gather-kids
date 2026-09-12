# Design Tokens

This document defines the gatherKids design token system, aligned with **Figma Foundations · Color** ([design file](https://www.figma.com/design/vSkNkDF9A7vNpOGIsM44XZ?node-id=4-54)).

## Theme: Teal + marigold · today (default)

This is the **only implemented theme**. Other theme modes (Deep forest / Indigo dusk / Moss + butter) exist in Figma but are **future work only** — do not implement them without explicit issue approval.

### Scope: All Functional Surfaces

**Figma is design direction, not an exhaustive screen catalog.** GatherSystem tokens, primitives, and Rule A apply across **all functional surfaces** in the app — not only screens with Figma frames. When implementing features without Figma designs, use these documented tokens and follow Rule A.

## Brand Primitives

These hex values are canonical. CSS variables and Tailwind config map to these primitives.

| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| `brand.teal` | `#017C7D` | `181 98% 29%` | Primary UI color for guardian/admin actions |
| `brand.yellow` (marigold) | `#FCB131` | `39 97% 59%` | **Door-staff CTAs ONLY** (see Rule A) |
| `brand.aqua` | `#1FB6AA` | `174 85% 41%` | Accent color |
| `brand.orange` | `#E86A2F` | `13 81% 55%` | Secondary accent |
| `brand.ground` | `#F7F5F1` | `40 33% 96%` | App background |
| `ink` | `#1E2A2F` | `199 26% 15%` | Primary text color |

## Semantic Token Mapping

The shadcn/ui design system and Tailwind config use semantic tokens that map to brand primitives:

```css
--primary: var(--color-teal)          /* Teal for general primary actions */
--secondary: var(--color-yellow)      /* Marigold (restricted use — see Rule A) */
--background: var(--color-bg)         /* brand.ground */
--foreground: var(--color-ink)        /* ink */
--accent: var(--color-aqua)           /* brand.aqua */
```

## Rule A: Color Usage Policy

**This rule is MANDATORY for all new features and must be followed by agents and humans.**

### Marigold (`brand.yellow` / `#FCB131`)

**ONLY** for door-staff check-in/check-out CTAs:
- Check-in buttons
- Check-out confirmation actions
- Door-staff emergency/override actions

**NOT** for:
- Guardian portal actions
- Admin dashboard actions
- General primary CTAs
- Navigation elements

### Teal (`brand.teal` / `#017C7D`)

**Primary color** for all other contexts:
- Guardian/parent portal primary CTAs
- Admin dashboard primary actions
- General UI primary buttons (default variant)
- Navigation active states
- Links and interactive elements

### Implementation in Components

#### Button Component

The `Button` component (`src/components/ui/button.tsx`) provides these variants:

```tsx
// General primary actions (guardian/admin) — TEAL
<Button variant="default">Save</Button>

// Door-staff CTAs ONLY — MARIGOLD
<Button variant="door">Check In</Button>

// General secondary actions
<Button variant="secondary">Cancel</Button>

// Other variants: destructive, outline, ghost, link
```

**Agent guidance:**
- When implementing check-in/check-out UI, use `variant="door"` for primary actions.
- When implementing guardian/admin UI, use `variant="default"` for primary actions.
- Never use `variant="door"` outside the check-in/check-out context.

## Files

| File | Purpose |
|------|---------|
| `src/app/globals.css` | CSS custom properties (HSL format) |
| `tailwind.config.ts` | Tailwind theme extension, brand color aliases |
| `src/components/ui/button.tsx` | Button variants including `door` |

## Future Theme Modes (NOT IMPLEMENTED)

These exist in Figma but are **out of scope** for current work:
- Deep forest (darker teal/green palette)
- Indigo dusk (purple/blue palette)
- Moss + butter (green/yellow palette)

Do not implement alternate themes unless explicitly authorized in a GitHub issue.

## Changelog

- **2026-09-12 (Okoye):** Initial documentation. Added `brand.ground` alias, `door` button variant, documented Rule A.
