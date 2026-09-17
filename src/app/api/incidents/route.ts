import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';

/**
 * Incidents the caller is allowed to see.
 *
 * Scoping happens here, not in the browser. The previous client-side path read
 * the whole `incidents` table and narrowed it in JavaScript, so every leader
 * received every child's name and incident description regardless of what the
 * UI then chose to display. Incidents are classified as sensitive and RLS does
 * not enforce this scope, so the filter has to run somewhere the caller cannot
 * reach. See #428.
 *
 * `?unacknowledged=true` returns only incidents awaiting acknowledgement.
 * `?date=YYYY-MM-DD` returns only incidents on that UTC day.
 */

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

		let query = supabase.from('incidents').select('*');

		// An admin sees every incident; anyone else sees only what they logged.
		// `auth.role` comes from service-role-owned `app_metadata` and
		// `auth.userId` from the validated JWT, so neither can be forged by the
		// caller. Applied as a database predicate, not a post-filter.
		if (auth.role !== 'ADMIN') {
			query = query.eq('leader_id', auth.userId);
		}

		if (request.nextUrl.searchParams.get('unacknowledged') === 'true') {
			query = query.is('admin_acknowledged_at', null);
		}

		const date = request.nextUrl.searchParams.get('date');
		if (date) {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
				return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
			}
			// Matches the previous client-side `timestamp.startsWith(date)`, which
			// compared the UTC ISO prefix.
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
