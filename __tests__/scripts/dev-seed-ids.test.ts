import { devSeedUuid } from '../../scripts/lib/dev-seed-ids.mjs';

/** RFC 4122 v5: version nibble 5, variant bits 10xx. */
const UUID_V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('devSeedUuid', () => {
	it('returns the same id for the same key, every time', () => {
		// This is the whole point. The seed guarded its inserts by primary key
		// while generating that key randomly, so the guard could never match and
		// every run re-inserted the same four children.
		expect(devSeedUuid('child', 'Smith Family', 'Emma', 'Smith')).toBe(
			devSeedUuid('child', 'Smith Family', 'Emma', 'Smith')
		);
	});

	it('produces a well-formed v5 UUID', () => {
		// Postgres rejects anything else in a uuid column.
		expect(devSeedUuid('household', 'Smith Family')).toMatch(UUID_V5);
	});

	it('separates the same natural key in different tables', () => {
		// A household and a guardian can share a surname.
		expect(devSeedUuid('household', 'Smith Family')).not.toBe(
			devSeedUuid('guardian', 'Smith Family')
		);
	});

	it('separates different rows in the same table', () => {
		const ids = [
			devSeedUuid('child', 'Smith Family', 'Emma', 'Smith'),
			devSeedUuid('child', 'Smith Family', 'Liam', 'Smith'),
			devSeedUuid('child', 'Johnson Family', 'Sophia', 'Johnson'),
			devSeedUuid('child', 'Johnson Family', 'Noah', 'Johnson'),
		];

		expect(new Set(ids).size).toBe(4);
	});

	it('ignores case and repeated whitespace in the key', () => {
		expect(devSeedUuid('household', 'smith   family')).toBe(
			devSeedUuid('household', 'Smith Family')
		);
	});

	it('does not let a multi-part key collide with a concatenated one', () => {
		// Joining on a separator that cannot appear in a normalised part is what
		// keeps ("Smith", "Family") distinct from ("Smith Family").
		expect(devSeedUuid('child', 'Smith', 'Family')).not.toBe(
			devSeedUuid('child', 'Smith Family')
		);
	});

	it('refuses an incomplete key rather than inventing one', () => {
		// A blank part would silently make two different rows share an id, and
		// the second insert would fail on a primary-key conflict at seed time.
		expect(() => devSeedUuid('child', 'Smith Family', '')).toThrow(
			/complete natural key/
		);
		expect(() => devSeedUuid('child')).toThrow(/complete natural key/);
		expect(() => devSeedUuid('', 'Smith Family')).toThrow(/requires a kind/);
	});

	it('pins the ids the seed writes, so a reseed does not orphan local data', () => {
		// Changing the namespace or the normalisation would rename every seeded
		// row on every developer's machine. That is a decision, not an accident:
		// this test is here to make it one.
		expect(devSeedUuid('household', 'Smith Family')).toBe(
			'ddc6b2de-9538-546d-8060-5acfe16db8f5'
		);
		expect(devSeedUuid('child', 'Smith Family', 'Emma', 'Smith')).toBe(
			'5dc9df4f-2402-51a9-a5dd-8ec0849f0ed1'
		);
	});
});
