#!/usr/bin/env node
/**
 * Backfill `app_metadata.role` from `user_metadata.role`.
 *
 * Authorization reads the role from `app_metadata`, which only the service role
 * can write. Existing accounts carry their role in `user_metadata`, so until
 * this runs they resolve as GUEST and admins lose access. Run it once per
 * environment BEFORE deploying the change that switches `requireAdmin` over.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
 *     node scripts/backfill-app-metadata-roles.mjs [--admins=a@x.com,b@y.com] [--apply]
 *
 * Without --apply it is a dry run and changes nothing.
 *
 * ## Why ADMIN needs an allowlist
 *
 * The source being copied, `user_metadata.role`, is exactly the claim this
 * migration exists to stop trusting: any signed-in user can set it on
 * themselves with `auth.updateUser({ data: { role: 'ADMIN' } })`. Copying it
 * unconditionally would launder a self-asserted ADMIN into the trusted store,
 * where it becomes indistinguishable from a real grant — reintroducing the
 * vulnerability through the migration meant to close it.
 *
 * So ADMIN is never copied on the strength of `user_metadata` alone. Name the
 * real admins with --admins, and every other ADMIN claim is refused and
 * reported. Lower-privilege roles copy freely: they confer far less, and there
 * are too many to enumerate.
 *
 * Never point this at an environment you have not been asked to touch, and
 * never commit a service-role key.
 */
import { createClient } from '@supabase/supabase-js';
import { decideBackfill, parseAllowedAdmins } from './lib/backfill-role-decision.mjs';

const apply = process.argv.includes('--apply');
const allowedAdmins = parseAllowedAdmins(process.argv);

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
	console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
	process.exit(1);
}

const supabase = createClient(url, serviceKey);

const summary = {
	scanned: 0,
	alreadySet: 0,
	backfilled: 0,
	noRole: 0,
	adminRefused: 0,
	failed: 0,
};
const refusedAdmins = [];
const pending = [];
let page = 1;

// Pass 1 — read everything and decide, writing nothing.
while (true) {
	const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
	if (error) {
		console.error('Failed to list users:', error.message);
		process.exit(1);
	}

	const users = data?.users ?? [];
	if (users.length === 0) break;

	for (const user of users) {
		summary.scanned += 1;
		const label = user.email || user.id;
		const decision = decideBackfill(user, allowedAdmins);

		if (decision.action === 'already-set') {
			summary.alreadySet += 1;
		} else if (decision.action === 'no-role') {
			summary.noRole += 1;
		} else if (decision.action === 'refuse-admin') {
			summary.adminRefused += 1;
			refusedAdmins.push(label);
		} else {
			pending.push({
				id: user.id,
				label,
				role: decision.role,
				appMetadata: user.app_metadata,
			});
		}
	}

	page += 1;
}

for (const item of pending) {
	console.log(`${apply ? 'setting' : 'would set'} ${item.label} -> ${item.role}`);
}

if (refusedAdmins.length > 0) {
	console.warn(
		`\nREFUSED ${refusedAdmins.length} self-asserted ADMIN claim(s) not named in --admins:`
	);
	for (const label of refusedAdmins) console.warn(`  ${label}`);
	console.warn(
		'\nEach of these accounts claims ADMIN in user_metadata, which the account holder\n' +
			'can set themselves. Check every one against who should actually be an admin.\n' +
			'Re-run with --admins=<comma-separated emails> naming only the legitimate ones.\n' +
			'An account here that you do not recognise is a self-promotion attempt: leave it\n' +
			'out, and clear its user_metadata.role separately.'
	);
}

// Pass 2 — write.
if (apply) {
	for (const item of pending) {
		const { error } = await supabase.auth.admin.updateUserById(item.id, {
			app_metadata: { ...item.appMetadata, role: item.role },
		});
		if (error) {
			summary.failed += 1;
			console.error(`  failed for ${item.label}: ${error.message}`);
		} else {
			summary.backfilled += 1;
		}
	}
} else {
	summary.backfilled = pending.length;
}

console.log(`\n${apply ? 'Applied' : 'Dry run'}:`, summary);
if (!apply) {
	console.log('Re-run with --apply to write the changes.');
}
if (summary.failed > 0) process.exit(1);
