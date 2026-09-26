/**
 * GatherSystem treatment for the Bible Bee household screen (#371 part 2).
 *
 * Same approach as `guardian-styles.ts`: class strings built from the #380
 * tokens, restating a weight where a host primitive would otherwise override
 * the token's own (see that file's header for why).
 *
 * Where the signed frames draw a size the scale does not have, the nearest
 * token is used and the choice is recorded here and on the PR:
 *   - page title 25px/700  → Display/28 (the home greeting, the same level)
 *   - large figure 24px/700 → Headline/22
 *   - verse 15px/25 Merriweather → Scripture/16 (16/26)
 *   - chips 11.5px → Label/12 at weight 500
 *   - celebration 21px/700 → Headline/22
 */

/** `BIBLE BEE · JUNIOR`, `MEMORIZED · 20`, `ESSAYS`. */
export const BB_EYEBROW = 'text-eyebrow-11 uppercase text-muted-foreground';

/** `Eli’s scriptures`. */
export const BB_TITLE = 'text-display-28 font-bold text-foreground';

/** The `9` in `9 of 20 memorized`. */
export const BB_FIGURE = 'text-headline-22 font-bold tabular-nums text-foreground';

/** `of 20 memorized · 11 to go`. */
export const BB_FIGURE_REST = 'text-body-14 font-medium text-muted-foreground';

/** The essay screen's sentence under the title. */
export const BB_INTRO = 'text-body-14 text-muted-foreground';

export const BB_PROGRESS_TRACK = 'h-2 w-full overflow-hidden rounded-full bg-muted';
export const BB_PROGRESS_FILL = 'h-full rounded-full bg-brand-aqua';

/** Segmented `To memorize 11 · Memorized 9 · All 20`. */
export const BB_SEGMENTED = 'flex w-full gap-1 rounded-md bg-muted p-[3px] md:w-auto';
export const BB_SEGMENT = [
	'flex-1',
	'whitespace-nowrap',
	'rounded-md',
	'px-4',
	'py-2',
	'text-label-12',
	'font-medium',
	'text-muted-foreground',
	'transition-colors',
	'focus-visible:outline-none',
	'focus-visible:ring-2',
	'focus-visible:ring-ring',
	'md:flex-none',
].join(' ');
export const BB_SEGMENT_ACTIVE = 'bg-card font-semibold text-foreground shadow-card';

/** `KJV` / `NIV`. Teal when chosen (Rule A: teal, never marigold). */
export const BB_TRANSLATION_CHIP = [
	'rounded-full',
	'border',
	'px-3.5',
	'py-1.5',
	'text-label-12',
	'transition-colors',
	'focus-visible:outline-none',
	'focus-visible:ring-2',
	'focus-visible:ring-ring',
].join(' ');
export const BB_TRANSLATION_CHIP_ON = 'border-primary bg-primary text-primary-foreground';
export const BB_TRANSLATION_CHIP_OFF = 'border-border bg-card font-medium text-foreground';

/** A scripture or essay card. */
export const BB_CARD = 'overflow-hidden rounded-lg border border-border bg-card shadow-card';

/** `Romans 8:28`, `Romans 8 reflection`. Title/18. */
export const BB_CARD_TITLE = [
	'text-title-18',
	'font-semibold',
	'leading-(--text-title-18--line-height)',
	'text-foreground',
].join(' ');

/** `#10`, `KJV`, `Due Oct 26`. */
export const BB_META_CHIP = [
	'inline-flex',
	'items-center',
	'rounded-full',
	'border',
	'border-border',
	'bg-background',
	'px-2.5',
	'py-1',
	'text-label-12',
	'font-medium',
	'text-muted-foreground',
].join(' ');

/** The verse itself. Merriweather is for scripture passages only. */
export const BB_VERSE = 'font-scripture text-scripture-16 text-foreground';

/** The round check on a scripture card. */
export const BB_CHECK = [
	'flex',
	'size-[38px]',
	'shrink-0',
	'items-center',
	'justify-center',
	'rounded-full',
	'border',
	'transition-colors',
	'focus-visible:outline-none',
	'focus-visible:ring-2',
	'focus-visible:ring-ring',
	'focus-visible:ring-offset-2',
	'disabled:opacity-60',
].join(' ');
export const BB_CHECK_OFF = 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary';
export const BB_CHECK_ON = 'border-brand-aqua bg-brand-aqua text-white';

/** Head of a memorized card, tinted as in `37:2`. */
export const BB_CARD_HEAD_DONE = 'bg-brand-aqua/10';

/** A quiet sand panel: the `1t` intro. */
export const BB_NOTE = 'rounded-lg border border-border bg-muted p-4 text-body-14 text-foreground';

/** `Every scripture memorized`. */
export const BB_CELEBRATION = 'flex flex-col items-center gap-2 rounded-xl border border-brand-aqua/30 bg-brand-aqua/10 p-6 text-center';
export const BB_CELEBRATION_TITLE = 'text-headline-22 font-bold text-brand-teal';
export const BB_CELEBRATION_BODY = 'text-body-14 text-brand-teal';

/** A row in the memorized list. */
export const BB_ROW = 'flex items-center gap-3 border-b border-border px-0.5 py-3 last:border-b-0';
export const BB_ROW_LABEL = 'min-w-0 flex-1 text-body-15 font-medium text-foreground';
export const BB_ROW_DATE = 'shrink-0 text-body-13 tabular-nums text-muted-foreground';

/** `Sort by date`, `Review all 20 verses`. Teal text actions. */
export const BB_TEXT_ACTION = [
	'rounded-sm',
	'text-body-13',
	'font-medium',
	'text-primary',
	'underline-offset-4',
	'hover:underline',
	'focus-visible:outline-none',
	'focus-visible:ring-2',
	'focus-visible:ring-ring',
].join(' ');

/** Essay status pills. The palette the rest of the app uses for the same two states. */
export const BB_PILL = 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-label-12';
export const BB_PILL_ASSIGNED = 'border border-brand-gold/30 bg-brand-gold-soft text-brand-gold';
export const BB_PILL_SUBMITTED = 'bg-brand-aqua/15 text-brand-teal';

/** `Upload Essay`: the screen's one filled call to action. Teal (Rule A). */
export const BB_PRIMARY_CTA = 'h-12 w-full text-body-15 font-semibold';

/** An essay already handed in, quieter than the assigned one. */
export const BB_SUBMITTED_CARD = 'flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3.5';
export const BB_SUBMITTED_TITLE = [
	'text-title-16',
	'font-semibold',
	'leading-(--text-title-16--line-height)',
	'text-foreground',
].join(' ');
