/**
 * Stable identifiers for the dev seed's fixture rows.
 *
 * `dev_seed.js` guarded its inserts by primary key, but generated that key with
 * `crypto.randomUUID()` immediately before looking it up — so the guard asked
 * whether a UUID invented microseconds earlier was already in the database, and
 * the answer was always no. Every run inserted the same families again.
 *
 * Events avoid this by using readable literal ids (`evt_sunday_school`). The
 * tables that need a real UUID can have the same property by deriving it from
 * the row's natural key instead of from randomness: the same fixture yields the
 * same id on every machine and every run, so an existence check means something.
 *
 * A useful side effect: a local URL naming a child or household keeps working
 * across a reseed, which it never did before.
 */

import crypto from 'node:crypto';

/**
 * Fixed namespace for gatherKids dev fixtures. Arbitrary but permanent —
 * changing it renames every seeded row, which would orphan existing local data.
 */
const DEV_SEED_NAMESPACE = 'b4f1c2de-6a83-4d7e-9c05-1f2a3b4c5d6e';

/** Separator that cannot occur in a normalised key part. */
const KEY_SEPARATOR = String.fromCharCode(0);

/**
 * A deterministic RFC 4122 v5 UUID for a dev fixture row.
 *
 * @param {string} kind Table or entity name, so the same natural key in two
 *   tables cannot collide (a household and a guardian may share a surname).
 * @param {...string} keyParts The row's natural key, in a stable order.
 * @returns {string} The same UUID for the same inputs, always.
 */
export function devSeedUuid(kind, ...keyParts) {
	if (!kind) {
		throw new Error('devSeedUuid requires a kind');
	}
	if (keyParts.length === 0 || keyParts.some((part) => !part)) {
		throw new Error(
			`devSeedUuid("${kind}") requires a complete natural key; got ${JSON.stringify(
				keyParts
			)}`
		);
	}

	// Case- and whitespace-insensitive, so "Smith Family" and "smith  family"
	// name the same row.
	const name = [kind, ...keyParts]
		.map((part) => String(part).trim().toLowerCase().replace(/\s+/g, ' '))
		.join(KEY_SEPARATOR);

	const namespaceBytes = Buffer.from(
		DEV_SEED_NAMESPACE.replace(/-/g, ''),
		'hex'
	);
	const hash = crypto
		.createHash('sha1')
		.update(Buffer.concat([namespaceBytes, Buffer.from(name, 'utf8')]))
		.digest();

	const bytes = Buffer.from(hash.subarray(0, 16));
	bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
	bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant

	const hex = bytes.toString('hex');
	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		hex.slice(12, 16),
		hex.slice(16, 20),
		hex.slice(20),
	].join('-');
}
