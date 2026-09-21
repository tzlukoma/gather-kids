/**
 * Shared GatherSystem treatment for the account surfaces (`/onboarding`,
 * `/unauthorized`).
 *
 * Class strings rather than components, for the same reason as
 * `staff-list-styles.ts`: these pages already have working markup, and
 * swapping a className keeps the diff to the attribute that is actually
 * changing. The auth logic, redirects and error handling stay literally the
 * same code on both sides of the flag.
 *
 * Every value comes from the type scale added in #380 / #476 — no ad-hoc
 * sizes. The colours needed no work: these pages were already on semantic
 * tokens (`bg-background`, `text-muted-foreground`, `text-destructive`) with
 * no raw hex and no door marigold, so "brand teal/ground/ink aligned" was
 * already true before this change. The gap was the type scale.
 *
 * Why the constants restate weight, leading and tracking: Tailwind emits those
 * three through override slots, e.g.
 * `font-weight: var(--tw-font-weight, var(--text-headline-22--font-weight))`.
 * `CardTitle` ships `font-semibold leading-none tracking-tight`, which sets
 * every slot and therefore beats the token whatever the class order — the
 * token would be declared and never applied. The restated values point back at
 * the token's own custom properties, so there is still one source of truth.
 */

/**
 * The card's own heading — the largest text on these single-card screens.
 * Figma Headline/22, replacing an ad-hoc `text-2xl` / `text-xl font-headline`.
 */
export const AUTH_CARD_TITLE = [
	'text-headline-22',
	// 700, matching `--text-headline-22--font-weight`. `font-semibold` here
	// rendered 600: it sets the override slot and beats the token, and the
	// difference is invisible unless you read the computed style.
	'font-bold',
	'leading-(--text-headline-22--line-height)',
	'tracking-(--text-headline-22--letter-spacing)',
	'text-foreground',
].join(' ');

/** Supporting copy under the heading. Figma Body/15. */
export const AUTH_CARD_DESCRIPTION = 'text-body-15 text-muted-foreground';

/** Secondary and helper copy, including field hints. Figma Body/14. */
export const AUTH_BODY_TEXT = 'text-body-14 text-muted-foreground';

/** Resting card surface, matching the staff screens. */
export const AUTH_CARD = 'shadow-card border-border';
