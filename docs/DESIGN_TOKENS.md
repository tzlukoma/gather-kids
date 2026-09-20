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

## Type Scale

Aligned with **Figma Foundations · Type** ([node 4-55](https://www.figma.com/design/vSkNkDF9A7vNpOGIsM44XZ?node-id=4-55)).

Three families, with a strict division of labour: **Work Sans carries the
interface, Merriweather is reserved for scripture passages, and Source Code Pro
labels tokens and codes.** Merriweather is never interface text.

Each step is a complete Figma text style — family, weight, size, line height and
tracking — exposed as one Tailwind utility. (Family comes from a companion rule
in `globals.css`; see the notes below.) Token names mirror Figma's own, so
`Body/14` in the design file is `text-body-14` in markup with no translation
step.

| Utility | Family | Weight | Size | Line height | Tracking |
|---|---|---|---|---|---|
| `text-display-28` | Work Sans | 700 | 28px | 32px | −0.02em |
| `text-headline-22` | Work Sans | 700 | 22px | 28px | −0.01em |
| `text-title-18` | Work Sans | 600 | 18px | 24px | −0.01em |
| `text-title-16` | Work Sans | 600 | 16px | 22px | — |
| `text-body-15` | Work Sans | 400 | 15px | 22px | — |
| `text-body-14` | Work Sans | 400 | 14px | 20px | — |
| `text-body-13` | Work Sans | 400 | 13px | 19px | — |
| `text-label-12` | Work Sans | 600 | 12px | 16px | — |
| `text-eyebrow-11` | Work Sans | 600 | 11px | 14px | +0.09em |
| `text-scripture-18` | Merriweather | 400 | 18px | 28px | — |
| `text-scripture-16` | Merriweather | 400 | 16px | 26px | — |
| `text-mono-12` | Source Code Pro | 400 | 12px | 16px | — |
| `text-mono-11` | Source Code Pro | 400 | 11.5px | 16px | — |

Sizes are declared in `rem` so the scale honours the reader's browser font size.
Figma's pixel values are at a 16px root (8px = 0.5rem).

### Notes for agents

- **`text-eyebrow-11` does not uppercase on its own.** Figma's Eyebrow style is
  uppercase, but text transform is not part of a Tailwind type token — pair it
  with `uppercase` at the call site.
- **Overrides compose cleanly.** Tailwind v4 emits each composite property
  through an override slot (`var(--tw-font-weight, …)`), so `font-bold`,
  `leading-*` and `tracking-*` beat the token regardless of source order. You do
  not need to worry about class ordering.
- **`letter-spacing` is only emitted where Figma sets non-zero tracking**, so a
  `tracking-*` utility composes normally on every other step.
- **The family is applied by a companion rule, not by the token.** Tailwind v4
  has no `--text-*--font-family` modifier — it emits font-size, line-height,
  letter-spacing and font-weight only, and silently drops a family declared
  that way. `globals.css` therefore pairs `font-family` onto the same class
  names, so each step is the whole Figma style. If you add a step, add it to
  the matching family rule too or it will inherit Work Sans from `body`.
- **Source Code Pro is not loaded.** `layout.tsx` loads only Work Sans and
  Merriweather via `next/font`, so `text-mono-*` resolves to the system
  monospace in the `--font-code` stack. Nothing consumes these tokens yet;
  load the family when the first screen does.

## Radius & Elevation

Aligned with **Figma Foundations · Radius & Elevation**
([node 4-56](https://www.figma.com/design/vSkNkDF9A7vNpOGIsM44XZ?node-id=4-56)).

### Radius

All corner radii derive from a single `--radius` token (`0.5rem`). This was
already conformant before this document described it.

| Utility | Value | Derivation |
|---|---|---|
| `rounded-sm` | 4px | `calc(var(--radius) - 4px)` |
| `rounded-md` | 6px | `calc(var(--radius) - 2px)` |
| `rounded-lg` | 8px | `var(--radius)` |

### Elevation

A short, warm-shadow scale — surfaces lift only as much as their job requires.
The tints are drawn from the brand palette rather than neutral grey:
`rgb(30 42 47)` is `ink` and `rgb(1 124 125)` is `brand.teal`.

| Utility | Shadow | Use for |
|---|---|---|
| `shadow-card` | `0 1px 3px rgb(0 0 0 / 0.07)` | Resting cards, rows, stat tiles |
| `shadow-raised` | `0 2px 8px rgb(30 42 47 / 0.07)` | Bottom nav, floating plates |
| `shadow-dock` | `0 4px 14px rgb(30 42 47 / 0.28)` | Sticky confirm dock, tooltips |
| `shadow-rail` | `0 1px 3px rgb(1 124 125 / 0.4)` | Selected teal nav item |

These deliberately do **not** reuse the names `shadow-sm` / `shadow-md`. Those
already exist in Tailwind's default scale and are in use across the app, so
redefining them would silently restyle existing screens.

## Density

Two densities, chosen by surface rather than by preference:

| Density | Surfaces |
|---|---|
| **Compact** | Check-in door, Bible Bee admin |
| **Comfy** | Guardian and household screens on mobile |

Compact surfaces are worked at speed by staff who need more on screen at once;
comfy surfaces are read by families on a phone, often one-handed. Pick the
density from the surface you are building, not from the component.

## Files

| File | Purpose |
|------|---------|
| `src/app/globals.css` | All design tokens: the `@theme` block (type scale, elevation, radius, colour aliases) and the `:root` custom properties. Tailwind 4 is configured in CSS — there is no `tailwind.config.ts`. |
| `src/app/layout.tsx` | `next/font` loading for Work Sans and Merriweather |
| `src/components/ui/button.tsx` | Button variants including `door` |

## Future Theme Modes (NOT IMPLEMENTED)

These exist in Figma but are **out of scope** for current work:
- Deep forest (darker teal/green palette)
- Indigo dusk (purple/blue palette)
- Moss + butter (green/yellow palette)

Do not implement alternate themes unless explicitly authorized in a GitHub issue.

## Changelog

- **2026-09-12 (Okoye):** Initial documentation. Added `brand.ground` alias, `door` button variant, documented Rule A.
- **2026-09-20 (#380):** Added the Figma type scale (13 steps), the four-step elevation scale, and density notes. Verified radius was already conformant. Dropped the stale `tailwind.config.ts` row — Tailwind 4 configures in CSS. Families are applied by a companion rule because Tailwind v4 has no `--text-*--font-family` modifier.
