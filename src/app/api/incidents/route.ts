import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';
import {
	getPreviousServiceDay,
	getServiceDayIso,
	getServiceDayRangeUtc,
} from '@/lib/utils/timezone';

/**
 * Incidents the caller is allowed to see.
 *
 * Scoping happens here, not in the browser. The client-side path read the whole
 * `incidents` table with the anon key and narrowed it in JavaScript, so any
 * valid session token could read every child's name and incident description
 * regardless of which screens that account was allowed to open. Incidents are
 * sensitive and RLS does not enforce this scope (#194), so the filter has to run
 * somewhere the caller cannot reach (#428).
 *
 * Three modes, and the scope is deliberately not the same for all three:
 *
 * - no parameter — the incidents list. An admin sees everything, anyone else
 *   only what they logged.
 * - `?unacknowledged=true` — the admin dashboard's pending count. Same scope.
 * - `?date=YYYY-MM-DD` — the door/roster view, and the exception. **Staff see
 *   that day's incidents, not only their own**, but only for the live service
 *   window (see `isLiveServiceWindow`). Check-in renders an incident marker per
 *   child, and a child hurt in an earlier service has to stay flagged to whoever
 *   hands them back at pickup, whichever leader wrote it up. Scoping this one to
 *   `leader_id` would silently delete a child-safety signal — no error, the
 *   badge would just stop appearing. Confirmed as a deliberate visibility
 *   decision by @tzlukoma on #430.
 *
 * `date` is caller-controlled, so the exception is bounded in time as well as by
 * role. Without that bound a ministry leader could walk the parameter backwards
 * one day at a time and reassemble the whole historical table this endpoint
 * exists to stop exposing.
 *
 * `date` is a **service day** — the church-local calendar day, not the UTC one
 * (#447). Anchoring it to UTC put the rollover at 8pm EDT, so incidents logged
 * during an evening programme landed on the following day and dropped out of the
 * door screen's window while the service was still running.
 */

const STAFF_ROLES = new Set(['ADMIN', 'MINISTRY_LEADER']);

/**
 * Is `date` inside the window the pickup signal actually needs?
 *
 * The carve-out exists so a child hurt earlier in *the session currently
 * running* stays flagged at the door. That justifies today and nothing else.
 *
 * `date` is a **service day** (church-local, see `getServiceDayIso`), so the
 * rollover is local midnight and can no longer fall inside a service the way the
 * UTC day's 8pm EDT boundary did (#447). The previous day is still allowed: it
 * keeps the span exactly as permissive as the UTC version this replaces, so a
 * screen left open across midnight during a late event does not lose the marker.
 * Two days is wide enough that the boundary can never bite and narrow enough
 * that the parameter cannot be walked backwards to enumerate history.
 *
 * The previous day comes from `getPreviousServiceDay`, not from subtracting 24
 * hours: on a DST transition day a fixed duration lands on the wrong day, either
 * collapsing the window to a single day or skipping a day and admitting one it
 * should not. Both are covered by tests.
 */
function isLiveServiceWindow(date: string, now: number = Date.now()): boolean {
	const today = getServiceDayIso(new Date(now));
	return date === today || date === getPreviousServiceDay(today);
}

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
		let dayRange: { start: string; end: string } | null = null;
		if (date !== null) {
			dayRange = getServiceDayRangeUtc(date);
			if (dayRange === null) {
				return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
			}
		}

		let query = supabase.from('incidents').select('*');

		// `auth.role` comes from service-role-owned `app_metadata` and
		// `auth.userId` from the validated JWT, so neither can be forged by the
		// caller. `date` can be, which is why the staff carve-out is bounded to
		// the live service window rather than any day the caller names. Applied
		// as a database predicate, not a post-filter, so rows the caller may not
		// see never leave the database.
		const seesEveryone =
			auth.role === 'ADMIN' ||
			(date !== null && STAFF_ROLES.has(auth.role) && isLiveServiceWindow(date));
		if (!seesEveryone) {
			query = query.eq('leader_id', auth.userId);
		}

		if (request.nextUrl.searchParams.get('unacknowledged') === 'true') {
			query = query.is('admin_acknowledged_at', null);
		}

		if (dayRange !== null) {
			// `timestamp` is stored in UTC, so the church-local day is applied as
			// the UTC instants that bracket it. The end bound is the next service
			// day's midnight rather than `start + 24h`, because a DST transition
			// day is 23 or 25 hours long. Built from the same validated range that
			// gated the 400, so there is no second parse that could disagree.
			query = query
				.gte('timestamp', dayRange.start)
				.lt('timestamp', dayRange.end);
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
