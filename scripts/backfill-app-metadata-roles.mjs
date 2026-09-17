#!/usr/bin/env node
/**
 * Backfill `app_metadata.role` from `user_metadata.role`.
 *
 * Authorization now reads the role from `app_metadata`, which only the service
 * role can write. Existing accounts carry their role in the self-asserted
 * `user_metadata`, so until this runs they resolve as GUEST and lose admin
 * access. Run it once per environment BEFORE deploying, or immediately after.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/backfill-app-metadata-roles.mjs [--apply]
 *
 * Without --apply it is a dry run and changes nothing.
 *
 * Never point this at an environment you have not been asked to touch, and
 * never commit a service-role key.
 */
import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
	console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
	process.exit(1);
}

const supabase = createClient(url, serviceKey);

const summary = { scanned: 0, alreadySet: 0, backfilled: 0, noRole: 0, failed: 0 };
let page = 1;

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
		const trusted = user.app_metadata?.role;
		const asserted = user.user_metadata?.role;

		if (typeof trusted === 'string' && trusted.length > 0) {
			summary.alreadySet += 1;
			continue;
		}
		if (typeof asserted !== 'string' || asserted.length === 0) {
			summary.noRole += 1;
			console.warn(`  no role to copy for ${user.email || user.id}`);
			continue;
		}

		console.log(`${apply ? 'setting' : 'would set'} ${user.email || user.id} -> ${asserted}`);
		if (!apply) {
			summary.backfilled += 1;
			continue;
		}

		const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
			app_metadata: { ...user.app_metadata, role: asserted },
		});
		if (updateError) {
			summary.failed += 1;
			console.error(`  failed for ${user.email || user.id}: ${updateError.message}`);
		} else {
			summary.backfilled += 1;
		}
	}

	page += 1;
}

console.log(`\n${apply ? 'Applied' : 'Dry run'}:`, summary);
if (!apply) console.log('Re-run with --apply to write the changes.');
if (summary.failed > 0) process.exit(1);
