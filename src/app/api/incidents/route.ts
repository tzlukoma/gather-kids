import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';

/**
 * Incidents the caller is allowed to see.
 *
 * Serves the GatherSystem incidents screen only, which is gated by
 * `gathersystem_incidents`. Nothing on the default path calls this route, so
 * turning the flag off restores `main`'s behaviour completely.
 *
 * Scoping happens here rather than in the browser. The client-side path reads
 * the whole `incidents` table and narrows it in JavaScript, so every leader
 * receives every child's name and incident description regardless of what the
 * UI then chooses to display. Incidents are sensitive and RLS does not enforce
 * this scope, so the filter has to run somewhere the caller cannot reach.
 *
 * #428 tracks the same defect on the legacy screen, the dashboard, rosters and
 * check-in. Those reads are deliberately left alone here: fixing them would
 * change the default path, and this PR keeps that identical to `main`.
 */

function getSupabaseAdmin(): SupabaseClient | null {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !supabaseServiceKey) {
		return null;
	}
	return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
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

		// An admin sees every incident; anyone else sees only what they logged —
		// the same visible set as the legacy screen. `auth.role` comes from
		// service-role-owned `app_metadata` and `auth.userId` from the validated
		// JWT, so neither can be forged by the caller. Applied as a database
		// predicate, not a post-filter, so other leaders' incidents never leave
		// the database.
		if (auth.role !== 'ADMIN') {
			query = query.eq('leader_id', auth.userId);
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
