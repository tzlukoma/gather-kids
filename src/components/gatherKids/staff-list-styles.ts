/**
 * Shared GatherSystem treatment for the staff ops lists (rosters, leaders,
 * ministries).
 *
 * These are class strings rather than components on purpose. The three screens
 * already have their own headers, filters and dialogs built around a shared
 * shadcn `Table`; wrapping them in new layout components would mean rewriting
 * working markup to fit an abstraction none of them asked for. Swapping a
 * className keeps the restyle to the attribute that is actually changing, so
 * the diff shows the visual change and nothing else, and the data and
 * permission paths stay literally the same code.
 *
 * Every value comes from the tokens added in #380 — no ad-hoc sizes.
 *
 * Why some constants restate a weight, leading or tracking the token already
 * declares: Tailwind emits those three through override slots, e.g.
 * `font-weight: var(--tw-font-weight, var(--text-display-28--font-weight))`.
 * Any explicit `font-*` / `leading-*` / `tracking-*` utility already on the
 * host component sets the slot and therefore beats the token, whatever the
 * class order. `Button` ships `font-medium` and `CardTitle` ships
 * `font-semibold leading-none tracking-tight`, so those have to be restated
 * here or the token is declared and never applied. The restated values point
 * back at the token's own custom properties so there is still one source of
 * truth.
 */

/** Small muted label above a page title. Figma's Eyebrow style is uppercase. */
export const STAFF_EYEBROW = 'text-eyebrow-11 uppercase text-muted-foreground';

/** The page's own name. Figma Display/28. `font-bold` displaces Button's `font-medium`. */
export const STAFF_PAGE_TITLE = 'text-display-28 font-bold text-foreground';

/** Card and section headings. Figma Title/18. Restates what `CardTitle` would otherwise win. */
export const STAFF_SECTION_TITLE = [
	'text-title-18',
	'font-semibold',
	'leading-(--text-title-18--line-height)',
	'tracking-(--text-title-18--letter-spacing)',
	'text-foreground',
].join(' ');

/** Supporting copy under a section heading. */
export const STAFF_SECTION_DESCRIPTION = 'text-body-14 text-muted-foreground';

/**
 * Dense desktop table.
 *
 * Staff work these lists at speed and want more rows in view, so the compact
 * density applies from `md` up. Below that the row padding stays as it is:
 * on a phone these cells are touch targets, and the 44px guidance wins over
 * fitting another row on screen.
 *
 * The header needs `h-9` as well as the padding — `TableHead` sets a fixed
 * `h-12`, so trimming its padding alone would not move it.
 *
 * The last column is the actions column on all three screens. Without
 * `whitespace-nowrap` its icon buttons wrap onto a second line once the column
 * is narrower than they are, and the row grows to fit them: on /ministries
 * that was two 44px buttons stacking into a 105px row, so the trimmed padding
 * bought nothing. Keeping them on one line is what actually makes the row
 * dense.
 */
export const STAFF_TABLE_DENSE = [
	'[&_tbody_td]:md:py-2',
	'[&_tbody_td]:md:align-middle',
	'[&_tbody_td:last-child]:md:whitespace-nowrap',
	'[&_thead_th]:md:h-9',
	'[&_thead_th]:md:py-2',
].join(' ');

/** Resting card surface. */
export const STAFF_CARD = 'shadow-card border-border';
