import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cn, GATHERSYSTEM_TEXT_TOKENS } from '@/lib/utils';
import {
	STAFF_EYEBROW,
	STAFF_PAGE_TITLE,
	STAFF_SECTION_DESCRIPTION,
	STAFF_SECTION_TITLE,
} from '@/components/gatherKids/staff-list-styles';

/**
 * tailwind-merge recognises a font size by its shape (`text-sm`, `text-2xl`,
 * `text-[13px]`) and files everything else under `text-*` as a colour. The
 * GatherSystem type scale from #380 is named, not sized, so without the
 * `font-size` extension in `cn` a pairing like
 * `cn('text-display-28', 'text-foreground')` silently drops the size and the
 * element renders at whatever it inherited.
 */
describe('cn() and the GatherSystem type scale', () => {
	it('registers every --text-* token declared in globals.css', () => {
		const css = readFileSync(
			join(process.cwd(), 'src/app/globals.css'),
			'utf8'
		);
		const declared = new Set(
			Array.from(css.matchAll(/^\s*--text-([a-z]+-\d+):/gm)).map((m) => m[1])
		);

		expect(declared.size).toBeGreaterThan(0);
		expect([...declared].sort()).toEqual([...GATHERSYSTEM_TEXT_TOKENS].sort());
	});

	it.each(GATHERSYSTEM_TEXT_TOKENS)(
		'keeps text-%s when it is paired with a text colour',
		(token) => {
			expect(cn(`text-${token}`, 'text-foreground')).toBe(
				`text-${token} text-foreground`
			);
		}
	);

	it('still resolves a genuine size conflict, last one winning', () => {
		expect(cn('text-body-14', 'text-display-28')).toBe('text-display-28');
		expect(cn('text-2xl', 'text-title-18')).toBe('text-title-18');
		expect(cn('text-title-18', 'text-2xl')).toBe('text-2xl');
	});

	it('leaves real colour utilities alone', () => {
		expect(cn('text-muted-foreground', 'text-foreground')).toBe(
			'text-foreground'
		);
	});
});

/**
 * Tailwind emits weight, leading and tracking through override slots, so an
 * explicit utility on the host component beats the token regardless of class
 * order. These are the host class strings the staff constants are actually
 * merged onto; if a shadcn component gains a conflicting utility, this fails.
 */
describe('staff list constants survive their host components', () => {
	const BUTTON = 'inline-flex items-center rounded-md text-sm font-medium';
	const CARD_TITLE = 'text-2xl font-semibold leading-none tracking-tight';
	const CARD_DESCRIPTION = 'text-sm text-muted-foreground';

	it('gives the page title Display/28 at its own weight', () => {
		const merged = cn(BUTTON, 'p-0 h-auto', STAFF_PAGE_TITLE);
		expect(merged).toContain('text-display-28');
		expect(merged).toContain('font-bold');
		expect(merged).not.toContain('text-sm');
		expect(merged).not.toContain('font-medium');
	});

	it('gives a card heading Title/18 at its own leading and tracking', () => {
		const merged = cn(CARD_TITLE, STAFF_SECTION_TITLE);
		expect(merged).toContain('text-title-18');
		expect(merged).not.toContain('text-2xl');
		expect(merged).not.toContain('leading-none');
		expect(merged).not.toContain('tracking-tight');
		expect(merged).toContain('leading-(--text-title-18--line-height)');
		expect(merged).toContain('tracking-(--text-title-18--letter-spacing)');
	});

	it('gives a card description Body/14', () => {
		const merged = cn(CARD_DESCRIPTION, STAFF_SECTION_DESCRIPTION);
		expect(merged).toContain('text-body-14');
		expect(merged).not.toContain('text-sm');
	});

	it('keeps the eyebrow at Eyebrow/11', () => {
		expect(cn(STAFF_EYEBROW)).toContain('text-eyebrow-11');
	});
});
