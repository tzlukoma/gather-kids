import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';

/**
 * Incidents the caller is allowed to see.
 *
 * Scoping happens here, not in the browser. The client-side path read the whole
 * `incidents` table and narrowed it in JavaScript, so every leader received
 * every child's name and incident description regardless of what the UI then
 * chose to display. Incidents are sensitive and RLS does not enforce this
 * scope, so the filter has to run somewhere the caller cannot reach (#428).
 *
 * Three modes, and the scope is deliberately not the same for all three:
 *
 * - no parameter — the incidents list. An admin sees everything, anyone else
 *   only what they logged.
 * - `?unacknowledged=true` — the admin dashboard's pending count. Same scope.
 * - `?date=YYYY-MM-DD` — the door/roster view, and the exception. **Any staff
 *   member sees that day's incidents, not only their own.** Check-in renders an
 *   incident marker per child, and a child hurt in an earlier service has to
 *   stay flagged to whoever hands them back at pickup, whichever leader wrote
 *   it up. Scoping this one to `leader_id` would silently delete a child-safety
 *   signal — no error, the badge would just stop appearing. Confirmed as a
 *   deliberate visibility decision by @tzlukoma on #430.
 *
 * The day view is still narrower than before: it ran unscoped from the browser
 * and reached guardians, who can open check-in and now see only their own.
 */

const STAFF_ROLES = new Set(['ADMIN', 'MINISTRY_LEADER']);

function getSupabaseAdmin(): SupabaseClient | null {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !supabaseServiceKey) {
		return null;
	}
	return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
	try {
		const auth = await requireUser();
		if (!auth.authorized) {
			return auth.response;
		}

		const supabase = getSupabaseAdmin();
		if (!supabase) {
			console.error(
				'GET /api/incidents: Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL'
			);
			return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
		}

		const date = request.nextUrl.searchParams.get('date');
		if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
		}

		let query = supabase.from('incidents').select('*');

		// `auth.role` comes from service-role-owned `app_metadata` and
		// `auth.userId` from the validated JWT, so neither can be forged by the
		// caller. Applied as a database predicate, not a post-filter, so rows the
		// caller may not see never leave the database.
		const seesEveryone =
			auth.role === 'ADMIN' || (date !== null && STAFF_ROLES.has(auth.role));
		if (!seesEveryone) {
			query = query.eq('leader_id', auth.userId);
		}

		if (request.nextUrl.searchParams.get('unacknowledged') === 'true') {
			query = query.is('admin_acknowledged_at', null);
		}

		if (date !== null) {
			// Matches the previous client-side `timestamp.startsWith(date)`, which
			// compared the UTC ISO prefix. `getTodayIsoDate` is UTC too, so the
			// window is unchanged.
			const start = `${date}T00:00:00.000Z`;
			const end = new Date(Date.parse(start) + 24 * 60 * 60 * 1000).toISOString();
			query = query.gte('timestamp', start).lt('timestamp', end);
		}

		const { data, error } = await query.order('timestamp', { ascending: false });

		if (error) {
			console.error('GET /api/incidents: Error reading incidents:', error);
			return NextResponse.json({ error: 'Failed to read incidents' }, { status: 500 });
		}

		return NextResponse.json({ incidents: data || [] });
	} catch (error) {
		console.error('GET /api/incidents: Unexpected error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
