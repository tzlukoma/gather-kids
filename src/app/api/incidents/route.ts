import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';

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
 */

const STAFF_ROLES = new Set(['ADMIN', 'MINISTRY_LEADER']);

const DAY_MS = 24 * 60 * 60 * 1000;

const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * Is `date` inside the window the pickup signal actually needs?
 *
 * The carve-out exists so a child hurt earlier in *the session currently
 * running* stays flagged at the door. That justifies today and nothing else —
 * except that "today" is a UTC day, and 00:00 UTC is 20:00 US Eastern, which
 * lands mid-service for an evening program. A check-in screen open across that
 * boundary would ask for the previous UTC day and silently lose the marker for
 * incidents logged by other leaders, which is the exact regression this scope
 * was written to prevent.
 *
 * So the window is the current UTC day plus the one before it: wide enough that
 * the boundary can never fall inside a service, narrow enough that it cannot be
 * used to enumerate history.
 */
function isLiveServiceWindow(date: string, now: number = Date.now()): boolean {
	return date === utcDay(now) || date === utcDay(now - DAY_MS);
}

/**
 * The caller's `date`, as a UTC-midnight timestamp, or null when it is not a
 * real calendar day.
 *
 * A shape check alone is not enough. `^\d{4}-\d{2}-\d{2}$` accepts
 * `2026-02-30`, which `Date.parse` silently normalises to 2026-03-02 — so the
 * route would answer for a different day than the one requested, with no error.
 * It also accepts `2026-99-99`, which parses to `NaN` and makes `toISOString`
 * throw, turning a bad request into a 500 instead of the documented 400.
 *
 * Requiring the parsed date to round-trip to exactly what the caller sent
 * rejects both: normalisation changes the string, and `NaN` never round-trips.
 */
function parseUtcDayStart(date: string): number | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return null;
	}
	const ms = Date.parse(`${date}T00:00:00.000Z`);
	if (Number.isNaN(ms)) {
		return null;
	}
	if (new Date(ms).toISOString().slice(0, 10) !== date) {
		return null;
	}
	return ms;
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
		let dayStartMs: number | null = null;
		if (date !== null) {
			dayStartMs = parseUtcDayStart(date);
			if (dayStartMs === null) {
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

		if (dayStartMs !== null) {
			// Matches the previous client-side `timestamp.startsWith(date)`, which
			// compared the UTC ISO prefix. `getTodayIsoDate` is UTC too, so the
			// window is unchanged. Built from the validated timestamp, so there is
			// no second parse that could disagree with the one that gated the 400.
			const start = new Date(dayStartMs).toISOString();
			const end = new Date(dayStartMs + DAY_MS).toISOString();
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
