import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cn } from '@/lib/utils';
import {
	GUARDIAN_AVATAR_TILE,
	GUARDIAN_CARD_BODY,
	GUARDIAN_CHILD_META,
	GUARDIAN_CHILD_NAME,
	GUARDIAN_CTA,
	GUARDIAN_EYEBROW,
	GUARDIAN_GREETING,
	GUARDIAN_PILL_BASE,
	GUARDIAN_PILL_ON_SITE,
	GUARDIAN_SECONDARY_CTA,
	GUARDIAN_STRIP_COUNT,
	GUARDIAN_STRIP_LABEL,
	GUARDIAN_SUBTITLE,
} from '@/components/gatherKids/guardian-styles';

const globalsCss = readFileSync(
	join(process.cwd(), 'src', 'app', 'globals.css'),
	'utf8'
);

/** The value a `--text-<token>--font-weight` declaration holds in globals.css. */
function declaredWeight(token: string): string {
	const match = globalsCss.match(
		new RegExp(`--text-${token}--font-weight:\\s*([^;]+);`)
	);
	if (!match) throw new Error(`No --text-${token}--font-weight in globals.css`);
	return match[1].trim();
}

/** The `rem` size a `--text-<token>` declaration holds in globals.css. */
function declaredSizeRem(token: string): number {
	const match = globalsCss.match(new RegExp(`--text-${token}:\\s*([\\d.]+)rem;`));
	if (!match) throw new Error(`No --text-${token} in globals.css`);
	return Number.parseFloat(match[1]);
}

/** Tailwind's named weights, as they appear in a class string. */
const WEIGHT_CLASSES: Record<string, string> = {
	'400': 'font-normal',
	'500': 'font-medium',
	'600': 'font-semibold',
	'700': 'font-bold',
};

describe('guardian home styles', () => {
	describe('survive the cn() merge', () => {
		// tailwind-merge classifies `text-*` by shape and treats anything it does
		// not recognise as a size as a colour. Every constant here pairs a named
		// size token with a colour, which is exactly the collision #374 fixed by
		// registering the tokens. This fails if that registration is lost.
		it.each([
			['GUARDIAN_EYEBROW', GUARDIAN_EYEBROW, 'text-eyebrow-11'],
			['GUARDIAN_GREETING', GUARDIAN_GREETING, 'text-display-28'],
			['GUARDIAN_SUBTITLE', GUARDIAN_SUBTITLE, 'text-body-15'],
			['GUARDIAN_CARD_BODY', GUARDIAN_CARD_BODY, 'text-body-13'],
			['GUARDIAN_CHILD_NAME', GUARDIAN_CHILD_NAME, 'text-title-16'],
			['GUARDIAN_CHILD_META', GUARDIAN_CHILD_META, 'text-body-13'],
			['GUARDIAN_CTA', GUARDIAN_CTA, 'text-body-15'],
			['GUARDIAN_PILL_BASE', GUARDIAN_PILL_BASE, 'text-label-12'],
			['GUARDIAN_STRIP_LABEL', GUARDIAN_STRIP_LABEL, 'text-label-12'],
			['GUARDIAN_STRIP_COUNT', GUARDIAN_STRIP_COUNT, 'text-label-12'],
			['GUARDIAN_SECONDARY_CTA', GUARDIAN_SECONDARY_CTA, 'text-body-15'],
		])('%s keeps its size token', (_name, classes, token) => {
			expect(cn(classes).split(' ')).toContain(token);
		});

		it('keeps the size token when the pill adds its state colour', () => {
			expect(cn(GUARDIAN_PILL_BASE, GUARDIAN_PILL_ON_SITE).split(' ')).toContain(
				'text-label-12'
			);
		});

		it('keeps the avatar tile size token beside its colour', () => {
			expect(cn(GUARDIAN_AVATAR_TILE).split(' ')).toContain('text-title-16');
		});
	});

	describe('restated weights match the token they restate', () => {
		// Tailwind emits font-weight through an override slot, so any explicit
		// `font-*` already on the element beats the token whatever the class
		// order, and `Button` ships `font-medium`, so these constants have to
		// restate a weight to win — and restating the *wrong* one is invisible
		// on screen but wrong against the signed type scale. The neighbouring
		// tokens differ (Title/16 is 600, Display/28 is 700), which is exactly
		// the kind of pair that was got wrong once already.
		it.each([
			['GUARDIAN_GREETING', GUARDIAN_GREETING, 'display-28'],
			['GUARDIAN_CHILD_NAME', GUARDIAN_CHILD_NAME, 'title-16'],
		])('%s restates %s’s own weight', (_name, classes, token) => {
			const expected = WEIGHT_CLASSES[declaredWeight(token)];
			expect(expected).toBeDefined();
			expect(classes.split(' ')).toContain(expected);
		});
	});

	describe('Rule A — teal CTAs, never marigold', () => {
		it('colours the card CTA from the primary token', () => {
			expect(GUARDIAN_CTA).toContain('text-primary');
		});

		it('uses no marigold, gold or yellow class anywhere', () => {
			const all = [
				GUARDIAN_EYEBROW,
				GUARDIAN_GREETING,
				GUARDIAN_SUBTITLE,
				GUARDIAN_CARD_BODY,
				GUARDIAN_CHILD_NAME,
				GUARDIAN_CHILD_META,
				GUARDIAN_CTA,
				GUARDIAN_PILL_BASE,
				GUARDIAN_PILL_ON_SITE,
				GUARDIAN_AVATAR_TILE,
				GUARDIAN_SECONDARY_CTA,
				GUARDIAN_STRIP_LABEL,
				GUARDIAN_STRIP_COUNT,
			].join(' ');
			expect(all).not.toMatch(/\b\S*(marigold|gold|yellow|orange)\S*\b/);
		});
	});

	describe('the Bible Bee strip stays under the child it belongs to', () => {
		// Folding the Bible Bee card into the child card is the one structural
		// departure from the signed frame, and it only works while the child's
		// name is the largest thing on the card. The frame's Display/28 figure
		// would outweigh it, so the strip is Label/12 throughout. If someone
		// later restores the big number inside the card, this fails.
		it.each([
			['GUARDIAN_STRIP_LABEL', GUARDIAN_STRIP_LABEL],
			['GUARDIAN_STRIP_COUNT', GUARDIAN_STRIP_COUNT],
		])('%s is smaller than the child name above it', (_name, classes) => {
			const size = classes
				.split(' ')
				.find((cls) => cls.startsWith('text-') && /\d$/.test(cls))
				?.replace('text-', '');
			expect(size).toBeDefined();
			expect(declaredSizeRem(size as string)).toBeLessThan(
				declaredSizeRem('title-16')
			);
		});

		it('carries no display token at all', () => {
			const strip = [GUARDIAN_STRIP_LABEL, GUARDIAN_STRIP_COUNT].join(' ');
			expect(strip).not.toContain('display-28');
			expect(strip).not.toContain('font-bold');
		});
	});

	describe('the secondary CTA is quieter than the card CTAs', () => {
		it('is teal but unboxed, so it does not compete with them', () => {
			expect(GUARDIAN_SECONDARY_CTA).toContain('text-primary');
			expect(GUARDIAN_SECONDARY_CTA).not.toContain('border');
			expect(GUARDIAN_CTA).toContain('border-primary/30');
		});
	});

	describe('CTA weight is deliberate, not inherited', () => {
		it('is semibold, which body-15 alone would not give it', () => {
			// The CTA borrows Body/15's size but not its weight: the signed frame
			// draws the button label at 600, and `--text-body-15--font-weight` is
			// 400. `Button` would otherwise settle it at its own `font-medium`.
			// So this one constant intentionally departs from its size token, and
			// the assertion is spelled out rather than derived.
			expect(declaredWeight('body-15')).toBe('400');
			expect(GUARDIAN_CTA.split(' ')).toContain('font-semibold');
		});
	});
});
