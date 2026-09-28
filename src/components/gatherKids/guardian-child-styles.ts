/**
 * GatherSystem treatment for the guardian child page (#378).
 *
 * Extends `guardian-styles.ts` with what only this page draws: section cards
 * with a titled header, label/value fields, and the program rows. Same rules as
 * there — every size is a #380 token, and a constant that lands on a component
 * shipping its own weight restates the weight.
 */

/** `← Back to household`. */
export const CHILD_BACK_LINK = [
	'inline-flex',
	'items-center',
	'gap-1.5',
	'text-body-13',
	'font-semibold',
	'text-primary',
	'hover:underline',
	'underline-offset-4',
].join(' ');

/** The 72px round avatar in the header, holding initials or the photo. */
export const CHILD_AVATAR = [
	'flex',
	'size-18',
	'shrink-0',
	'items-center',
	'justify-center',
	'overflow-hidden',
	'rounded-full',
	'bg-brand-aqua/15',
	'text-headline-22',
	'font-semibold',
	'text-brand-teal',
].join(' ');

/** The small camera button sitting on the avatar's lower-right edge. */
export const CHILD_AVATAR_CAMERA = [
	'absolute',
	'-right-1',
	'-bottom-1',
	'flex',
	'size-7',
	'items-center',
	'justify-center',
	'rounded-full',
	'border',
	'border-border',
	'bg-card',
	'text-muted-foreground',
	'shadow-card',
	'hover:text-primary',
	'focus-visible:outline-none',
	'focus-visible:ring-2',
	'focus-visible:ring-ring',
].join(' ');

/**
 * `Birthday this week`. The frame draws it in the orange tint. The tint and the
 * cake stay orange; the words are ink, because orange text at 12px on its own
 * tint does not reach AA contrast.
 */
export const CHILD_BIRTHDAY_BADGE = [
	'inline-flex',
	'items-center',
	'gap-1.5',
	'rounded-full',
	'bg-brand-orange/10',
	'px-2.5',
	'py-1',
	'text-label-12',
	'font-semibold',
	'text-foreground',
].join(' ');

/** `3rd Grade · Age 9 · Born Mar 14, 2017 · Bennett Household`. */
export const CHILD_HEADER_META = 'text-body-14 text-muted-foreground';

/** `Update photo`: the neutral outline button next to the primary action. */
export const CHILD_OUTLINE_ACTION = 'bg-card text-body-14 font-semibold';

/** `Edit profile`: the page's one primary action. Teal, per Rule A. */
export const CHILD_PRIMARY_ACTION = 'text-body-14 font-semibold';

/** Header strip of a section card: icon plus title, ruled off from the body. */
export const CHILD_SECTION_HEADER = [
	'flex',
	'items-center',
	'gap-2.5',
	'border-b',
	'border-border',
	'px-5',
	'py-4',
].join(' ');

export const CHILD_SECTION_ICON = 'size-4 shrink-0 text-primary';

/** `Medical & care`. Title/16, weight 600. */
export const CHILD_SECTION_TITLE = [
	'text-title-16',
	'font-semibold',
	'leading-(--text-title-16--line-height)',
	'text-foreground',
].join(' ');

export const CHILD_SECTION_BODY = 'flex flex-col gap-4 p-5';

/** `Special needs` over `No`. */
export const CHILD_FIELD_LABEL = 'text-label-12 text-muted-foreground';
export const CHILD_FIELD_VALUE = 'text-body-14 text-foreground break-words';

/**
 * The allergy warning. The border, tint and icon carry the destructive red;
 * the words are ink. `--destructive` on its own 5% tint is about 3.5:1, short
 * of AA for 12–14px text, and the palette has no darker red to reach for.
 */
export const CHILD_ALLERGY_BOX = [
	'flex',
	'gap-3',
	'rounded-md',
	'border',
	'border-destructive/30',
	'bg-destructive/5',
	'p-3.5',
	'text-foreground',
].join(' ');

/** `FALL 2026 CYCLE` above the program rows. */
export const CHILD_CYCLE_EYEBROW = 'text-eyebrow-11 uppercase tracking-wide text-muted-foreground';

/** One program row. */
export const CHILD_PROGRAM_ROW = [
	'flex',
	'items-center',
	'justify-between',
	'gap-3',
	'rounded-md',
	'border',
	'border-border',
	'bg-background',
	'px-3.5',
	'py-3',
].join(' ');

export const CHILD_PROGRAM_LINK = [
	'inline-flex',
	'items-center',
	'gap-1',
	'whitespace-nowrap',
	'text-label-12',
	'font-semibold',
	'text-primary',
	'hover:underline',
	'underline-offset-4',
].join(' ');

/** `Only ministry staff check children out, at the door.` */
export const CHILD_STAFF_NOTE = [
	'flex',
	'gap-2.5',
	'rounded-md',
	'bg-muted',
	'p-3',
	'text-body-13',
	'text-muted-foreground',
].join(' ');

/** A ruled group inside the Pickup & safety card. */
export const CHILD_RULED_GROUP = 'flex flex-col gap-1 border-t border-border pt-4 first:border-t-0 first:pt-0';
