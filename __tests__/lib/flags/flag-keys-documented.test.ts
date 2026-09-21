import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { GATHERSYSTEM_FLAG_KEYS } from '@/lib/flags/env';

/**
 * A new GatherSystem key has to be documented and locally runnable in the same
 * PR that adds it. Nothing enforced that until now: `gathersystem_auth` was
 * added in #379 with no registry row and no place in `dev:gathersystem`, and it
 * took a reviewer to notice. The code is the one place the full list exists, so
 * the code is what should check.
 */

const root = process.cwd();
const featureFlagsDoc = readFileSync(
	join(root, 'docs', 'FEATURE_FLAGS.md'),
	'utf8'
);
const packageJson = JSON.parse(
	readFileSync(join(root, 'package.json'), 'utf8')
) as { scripts: Record<string, string> };

describe('every GatherSystem flag key is documented', () => {
	it.each([...GATHERSYSTEM_FLAG_KEYS])(
		'%s has a row in the named-keys registry',
		(key) => {
			// A table row, not a passing mention: the registry is where an operator
			// looks for intent and enablement conditions, and a key discussed only
			// in prose elsewhere gives them neither.
			const row = new RegExp(`^\\|\\s*\`${key}\`\\s*\\|`, 'm');
			expect(featureFlagsDoc).toMatch(row);
		}
	);

	it.each([...GATHERSYSTEM_FLAG_KEYS])(
		'%s states an intent and a prerequisite',
		(key) => {
			const row = featureFlagsDoc
				.split('\n')
				.find((line) => line.trimStart().startsWith(`| \`${key}\``));
			expect(row).toBeDefined();

			// `| key | intent | prerequisite |` — three cells, none of them blank.
			// An em dash is a valid prerequisite: it means "none", deliberately.
			const cells = (row as string)
				.split('|')
				.slice(1, -1)
				.map((cell) => cell.trim());
			expect(cells).toHaveLength(3);
			expect(cells[1].length).toBeGreaterThan(0);
			expect(cells[2].length).toBeGreaterThan(0);
		}
	);

	it.each([...GATHERSYSTEM_FLAG_KEYS])(
		'%s is in the dev:gathersystem override list',
		(key) => {
			// Otherwise the screen the key gates cannot be seen locally at all, and
			// the omission is silent: unknown keys in the list are dropped without
			// a warning, so a missing one looks exactly like a flag that is off.
			const script = packageJson.scripts['dev:gathersystem'];
			expect(script).toBeDefined();

			const listed = (script.match(/GATHERSYSTEM_LOCAL_FLAGS=([^\s]+)/)?.[1] ?? '')
				.split(',')
				.map((entry) => entry.trim());
			expect(listed).toContain(key);
		}
	);

	it('the registry has no rows for keys that no longer exist', () => {
		// The other direction: a removed key left in the table tells an operator
		// to enable something that is not read anywhere.
		const documented = [...featureFlagsDoc.matchAll(/^\|\s*`(gathersystem_\w+)`\s*\|/gm)].map(
			(match) => match[1]
		);
		expect(documented.length).toBeGreaterThan(0);
		expect([...new Set(documented)].sort()).toEqual(
			[...GATHERSYSTEM_FLAG_KEYS].sort()
		);
	});
});
