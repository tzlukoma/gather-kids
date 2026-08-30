import { parseChangelog } from '@/lib/help/parse-changelog';

const SAMPLE = `# Changelog

## [1.8.1](https://example.com/compare/v1.8.0...v1.8.1) (2026-08-30)

### Bug Fixes

* **admin:** convert create-admin-user script to ESM ([#253](https://example.com/issues/253)) ([70d1f87](https://example.com/commit/70d1f87))
* **ci:** compare only public.Tables in types drift check ([12591b6](https://example.com/commit/12591b6))

## [1.8.0](https://example.com/compare/v1.7.1...v1.8.0) (2026-08-30)

### Features

* **register:** returning-family registration for Fall 2026 (R1) ([141d9fe](https://example.com/commit/141d9fe))
* **register:** returning-family registration for Fall 2026 (R1) ([45e8d40](https://example.com/commit/45e8d40))
* **register:** welcome back copy for returning families ([7ee09ba](https://example.com/commit/7ee09ba))

### Bug Fixes

* **household:** expand newest registration cycle in accordion ([82bf3a5](https://example.com/commit/82bf3a5))

### Miscellaneous Chores

* **main:** release 1.8.0
`;

describe('parseChangelog', () => {
	const releases = parseChangelog(SAMPLE);

	it('lists releases newest first', () => {
		expect(releases.map((r) => r.slug)).toEqual(['v1.8.1', 'v1.8.0']);
	});

	it('keeps user-facing features and fixes', () => {
		expect(releases[0].fixes.map((i) => i.text)).toEqual([
			expect.stringContaining('**admin:**'),
		]);
		expect(releases[1].features).toHaveLength(2);
		expect(releases[1].fixes).toHaveLength(1);
	});

	it('hides ci/chore items and sections', () => {
		expect(releases[0].fixes.some((i) => i.text.includes('**ci:**'))).toBe(
			false
		);
	});

	it('deduplicates duplicate squash-merge feature lines', () => {
		const texts = releases[1].features.map((i) => i.text);
		const returning = texts.filter((t) =>
			t.includes('returning-family registration')
		);
		expect(returning).toHaveLength(1);
	});

	it('keeps changelog text as text and only treats markdown links as links', () => {
		const poisoned = parseChangelog(`# Changelog

## [1.0.0](https://example.com/compare/v0.0.0...v1.0.0) (2026-01-01)

### Features

* **register:** hello <script>alert(1)</script> ([#1](https://example.com/issues/1))
`);
		const item = poisoned[0].features[0];
		expect(item.parts.some((part) => part.type === 'text' && part.value.includes('<script>'))).toBe(
			true
		);
		expect(item.parts.filter((part) => part.type === 'link')).toEqual([
			{
				type: 'link',
				href: 'https://example.com/issues/1',
				label: '#1',
			},
		]);
	});
});
