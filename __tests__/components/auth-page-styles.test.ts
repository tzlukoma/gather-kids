import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cn } from '@/lib/utils';
import {
	AUTH_BODY_TEXT,
	AUTH_CARD,
	AUTH_CARD_DESCRIPTION,
	AUTH_CARD_TITLE,
} from '@/components/auth/auth-page-styles';

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

/** Tailwind's named weights, as they appear in a class string. */
const WEIGHT_CLASSES: Record<string, string> = {
	'400': 'font-normal',
	'500': 'font-medium',
	'600': 'font-semibold',
	'700': 'font-bold',
};

describe('auth page styles', () => {
	describe('survive the cn() merge', () => {
		// tailwind-merge classifies `text-*` by shape and treats anything it does
		// not recognise as a size as a colour. Before #374 these named tokens
		// were silently dropped whenever they met a colour class — which is
		// exactly how every constant here is used. The tokens are registered
		// now; this fails if that registration is ever lost.
		it.each([
			['AUTH_CARD_TITLE', AUTH_CARD_TITLE, 'text-headline-22'],
			['AUTH_CARD_DESCRIPTION', AUTH_CARD_DESCRIPTION, 'text-body-15'],
			['AUTH_BODY_TEXT', AUTH_BODY_TEXT, 'text-body-14'],
		])('%s keeps its size token', (_name, classes, token) => {
			expect(cn(classes).split(' ')).toContain(token);
		});

		it('keeps the size token when a page adds its own colour', () => {
			expect(cn(AUTH_CARD_TITLE, 'text-destructive').split(' ')).toContain(
				'text-headline-22'
			);
		});
	});

	describe('restated weights match the token they restate', () => {
		// Tailwind emits font-weight through an override slot, so any explicit
		// `font-*` on the element beats the token. `CardTitle` ships
		// `font-semibold`, so the constant has to restate a weight to win — and
		// restating the *wrong* one is invisible on screen but wrong against the
		// spec. This shipped as `font-semibold` against a 700 token and only
		// turned up when the computed style was read in a browser.
		it('AUTH_CARD_TITLE uses the weight declared for headline-22', () => {
			const expected = WEIGHT_CLASSES[declaredWeight('headline-22')];
			expect(expected).toBeDefined();
			expect(AUTH_CARD_TITLE.split(' ')).toContain(expected);
		});

		it('AUTH_CARD_TITLE restates leading and tracking from the token itself', () => {
			// Pointing at the custom property rather than a literal keeps one
			// source of truth, so a change in globals.css carries through.
			expect(AUTH_CARD_TITLE).toContain(
				'leading-(--text-headline-22--line-height)'
			);
			expect(AUTH_CARD_TITLE).toContain(
				'tracking-(--text-headline-22--letter-spacing)'
			);
		});

		it('body constants do not restate a weight they do not need', () => {
			// Nothing in the card ships a competing `font-*` for body copy, and a
			// restated weight there would be one more thing to keep in sync.
			for (const classes of [AUTH_CARD_DESCRIPTION, AUTH_BODY_TEXT]) {
				expect(classes).not.toMatch(/\bfont-(normal|medium|semibold|bold)\b/);
			}
		});
	});

	describe('colour', () => {
		/**
		 * A Tailwind palette shade, e.g. `text-slate-500`. Matched by name rather
		 * than by "word then number", because the type tokens are themselves
		 * `text-<name>-<number>` and would trip a looser pattern.
		 */
		const PALETTE_SHADE =
			/\b(?:bg|text|border|ring|from|to|via)-(?:slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|marigold)-\d{2,3}\b/i;

		it('uses semantic tokens only — no raw hex, no palette shades', () => {
			// The acceptance on #379 is "brand teal/ground/ink aligned; no door
			// marigold". Semantic tokens inherit whatever theme is active, so
			// staying on them is what keeps that true.
			for (const classes of [
				AUTH_CARD_TITLE,
				AUTH_CARD_DESCRIPTION,
				AUTH_BODY_TEXT,
				AUTH_CARD,
			]) {
				expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b/i);
				expect(classes).not.toMatch(PALETTE_SHADE);
			}
		});

		it('would catch a palette shade if one were added', () => {
			// Guards the guard: the pattern above has to be narrow enough to let
			// `text-headline-22` through and still wide enough to catch this.
			expect('text-body-15 text-amber-600').toMatch(PALETTE_SHADE);
			expect('text-headline-22 text-foreground').not.toMatch(PALETTE_SHADE);
		});
	});
});
