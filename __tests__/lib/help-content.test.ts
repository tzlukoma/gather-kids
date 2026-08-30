import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { allHelpSlugs } from '@/lib/help/sidebar';
import {
	extractHelpHrefTargets,
	extractScreenshotPaths,
	loadAllHelpDocs,
	loadHelpDoc,
} from '@/lib/help/load-guide';
import { parseChangelog } from '@/lib/help/parse-changelog';
import { readFileSync } from 'node:fs';

describe('help content', () => {
	const docs = loadAllHelpDocs();

	it('loads every sidebar article', () => {
		for (const slug of allHelpSlugs()) {
			expect(loadHelpDoc(slug)).not.toBeNull();
		}
	});

	it('has no broken internal /help article links', () => {
		const slugs = new Set(allHelpSlugs());
		for (const doc of docs) {
			for (const href of extractHelpHrefTargets(doc.content)) {
				if (href === '/help' || href.startsWith('/help/releases')) continue;
				if (href.startsWith('/help/screenshots/')) continue;
				const slug = href.replace(/^\/help\//, '');
				expect(slugs.has(slug) || loadHelpDoc(slug)).toBeTruthy();
			}
		}
	});

	it('references screenshot files that exist', () => {
		const missing: string[] = [];
		for (const doc of docs) {
			for (const shot of extractScreenshotPaths(doc.content)) {
				const disk = join(process.cwd(), 'public', shot.replace(/^\//, ''));
				if (!existsSync(disk)) missing.push(`${doc.slug}: ${shot}`);
			}
		}
		expect(missing).toEqual([]);
	});

	it('parses the repo CHANGELOG including v1.8.0', () => {
		const markdown = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf8');
		const releases = parseChangelog(markdown);
		expect(releases.length).toBeGreaterThan(0);
		expect(releases[0].slug).toMatch(/^v\d+\.\d+\.\d+$/);
		const r180 = releases.find((r) => r.version === '1.8.0');
		expect(r180).toBeDefined();
		expect(r180?.features.length).toBeGreaterThan(0);
	});
});
