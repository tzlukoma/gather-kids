/**
 * Shared GatherSystem treatment for the guardian household surface (#371).
 *
 * Class strings rather than components, for the same reason as
 * `staff-list-styles.ts`: the values come from the tokens added in #380 and
 * nothing here is an ad-hoc size.
 *
 * Why some constants restate a weight, leading or tracking the token already
 * declares: Tailwind emits those three through override slots, e.g.
 * `font-weight: var(--tw-font-weight, var(--text-display-28--font-weight))`.
 * Any explicit `font-*` / `leading-*` / `tracking-*` utility already on the host
 * component sets the slot and therefore beats the token, whatever the class
 * order. `CardTitle` ships `font-semibold leading-none tracking-tight`, so a
 * constant used on one has to restate its token's values or the token is
 * declared and never applied. The restated values point back at the token's own
 * custom properties, so there is still one source of truth.
 */

/** Small muted label above the greeting and over the children list. */
export const GUARDIAN_EYEBROW = 'text-eyebrow-11 uppercase text-muted-foreground';

/** `Good morning, Tasha`. Figma Display/28, weight 700. */
export const GUARDIAN_GREETING = 'text-display-28 font-bold text-foreground';

/** `Bennett household · Fall 2026 cycle`. */
export const GUARDIAN_SUBTITLE = 'text-body-15 text-muted-foreground';

/**
 * Card headings — `Bible Bee`. Figma Title/18, weight 600. Restates what
 * `CardTitle` would otherwise win.
 */
export const GUARDIAN_CARD_TITLE = [
	'text-title-18',
	'font-semibold',
	'leading-(--text-title-18--line-height)',
	'tracking-(--text-title-18--letter-spacing)',
	'text-foreground',
].join(' ');

/** The `Eli · Junior` note opposite a card heading. */
export const GUARDIAN_CARD_NOTE = 'text-body-13 text-muted-foreground';

/** `9` — the big count in the Bible Bee card. Display/28, weight 700. */
export const GUARDIAN_METRIC = 'text-display-28 font-bold text-foreground';

/** `of 20 scriptures memorized`, sitting on the metric's baseline. */
export const GUARDIAN_METRIC_UNIT = 'text-body-14 text-muted-foreground';

/** The sentence under the progress bar. */
export const GUARDIAN_CARD_BODY = 'text-body-13 text-muted-foreground';

/** A child's name in the children list. Title/16, weight 600. */
export const GUARDIAN_CHILD_NAME = [
	'text-title-16',
	'font-semibold',
	'leading-(--text-title-16--line-height)',
	'text-foreground',
].join(' ');

/** `1st Grade · Sunday School`. */
export const GUARDIAN_CHILD_META = 'text-body-13 text-muted-foreground';

/**
 * The card's call to action — `Open scripture list`.
 *
 * Rule A: GatherSystem guardian CTAs are teal, never marigold. `Button`'s
 * `outline` variant gives the shape and the focus ring; this restates the
 * colour, because `outline` is neutral by default.
 *
 * The one constant here that borrows a size token's size but not its weight:
 * the signed frame draws this label at 15px/600, and `--text-body-15` is 400.
 * There is no 15px/600 token to reach for, so the weight is set explicitly —
 * which also displaces the `font-medium` the base `Button` ships.
 */
export const GUARDIAN_CTA = [
	'w-full',
	'border-primary/30',
	'bg-card',
	'text-body-15',
	'font-semibold',
	'text-primary',
	'hover:bg-brand-aqua/10',
	'hover:text-primary',
].join(' ');

/** Resting card surface, matching the staff side. */
export const GUARDIAN_CARD = 'shadow-card border-border';

/**
 * Avatar tile holding a child's initials. Square and 52px in the frame; the
 * `shrink-0` keeps it square when a long name pushes on the row.
 */
export const GUARDIAN_AVATAR_TILE = [
	'flex',
	'h-13',
	'w-13',
	'shrink-0',
	'items-center',
	'justify-center',
	'rounded-md',
	'border',
	'border-border',
	'bg-muted',
	'text-title-16',
	'font-semibold',
	'text-muted-foreground',
].join(' ');

/**
 * Status pill. The palette is the one the GatherSystem door already uses for
 * the same two states, so a child reads the same on the guardian's phone as on
 * the check-in table.
 */
export const GUARDIAN_PILL_BASE = [
	'inline-flex',
	'items-center',
	'gap-2',
	'whitespace-nowrap',
	'rounded-full',
	'px-2.5',
	'py-1',
	'text-label-12',
].join(' ');

export const GUARDIAN_PILL_ON_SITE = 'bg-brand-aqua/15 text-brand-teal';
export const GUARDIAN_PILL_AWAY = 'bg-muted text-muted-foreground';
export const GUARDIAN_PILL_DOT_ON_SITE = 'bg-brand-teal';

/** Bottom tab bar label, in its two states. */
export const GUARDIAN_TAB_LABEL = 'text-eyebrow-11 normal-case tracking-normal';
export const GUARDIAN_TAB_ACTIVE = 'text-primary';
export const GUARDIAN_TAB_INACTIVE = 'text-muted-foreground';
