/**
 * Decide what the role backfill should do with one account.
 *
 * Pure and separated from the script so the ADMIN allowlist — which is a
 * security control, not a convenience — can be tested. See
 * `scripts/backfill-app-metadata-roles.mjs` for why it exists.
 *
 * @param {{ email?: string|null, app_metadata?: Record<string, unknown>, user_metadata?: Record<string, unknown> }} user
 * @param {Set<string>} allowedAdmins lowercased emails permitted to receive ADMIN
 * @returns {{ action: 'already-set'|'no-role'|'refuse-admin'|'set', role?: string }}
 */
export function decideBackfill(user, allowedAdmins) {
	const trusted = user?.app_metadata?.role;
	if (typeof trusted === 'string' && trusted.length > 0) {
		return { action: 'already-set' };
	}

	const asserted = user?.user_metadata?.role;
	if (typeof asserted !== 'string' || asserted.length === 0) {
		return { action: 'no-role' };
	}

	// The load-bearing check. `user_metadata.role` is the claim this migration
	// exists to stop trusting, so it cannot be the authority for granting the
	// role that matters most.
	if (asserted === 'ADMIN' && !allowedAdmins.has(String(user?.email || '').toLowerCase())) {
		return { action: 'refuse-admin' };
	}

	return { action: 'set', role: asserted };
}

/** Parse `--admins=a@x.com,b@y.com` into a lowercased set. */
export function parseAllowedAdmins(argv) {
	const arg = argv.find((a) => a.startsWith('--admins='));
	return new Set(
		(arg ? arg.slice('--admins='.length) : '')
			.split(',')
			.map((e) => e.trim().toLowerCase())
			.filter(Boolean)
	);
}
