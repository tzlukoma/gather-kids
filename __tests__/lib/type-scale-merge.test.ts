import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cn, GATHERSYSTEM_TEXT_TOKENS } from '@/lib/utils';

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
