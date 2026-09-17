import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';

/**
 * Child -> ministry memberships for the incidents the caller is allowed to see.
 *
 * The incidents screen needs this to drive its ministry filter. The allowed
 * children are derived here, from the session, and the request body is not
 * consulted: the client sends only a cycle scope. Passing a child list from the
 * browser would make the restriction advisory, since anyone can call this route
 * with different ids.
 *
 * Only `child_id` and `ministry_id` are returned. Enrollment rows also carry
 * `custom_fields`, which has no business reaching a filter control.
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
				'GET /api/incidents/ministry-scope: Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL'
			);
			return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
		}

		const cycleId = request.nextUrl.searchParams.get('cycleId') || undefined;

		// Mirrors `getIncidentsForUser`: an admin sees every incident, anyone else
		// sees only incidents they logged. `auth.userId` comes from the validated
		// JWT, so a leader cannot widen this by editing the request.
		const { data: incidentRows, error: incidentError } = await supabase
			.from('incidents')
			.select('child_id, leader_id');

		if (incidentError) {
			console.error(
				'GET /api/incidents/ministry-scope: Error reading incidents:',
				incidentError
			);
			return NextResponse.json({ error: 'Failed to resolve incident scope' }, { status: 500 });
		}

		const visible =
			auth.role === 'ADMIN'
				? incidentRows || []
				: (incidentRows || []).filter((row) => row.leader_id === auth.userId);

		const childIds = Array.from(
			new Set(
				visible
					.map((row) => row.child_id)
					.filter((id): id is string => typeof id === 'string' && id.length > 0)
			)
		);

		if (childIds.length === 0) {
			return NextResponse.json({ pairs: [] });
		}

		const CHUNK = 200;
		const pairs: Array<{ child_id: string; ministry_id: string }> = [];

		for (let i = 0; i < childIds.length; i += CHUNK) {
			let query = supabase
				.from('ministry_enrollments')
				.select('child_id, ministry_id')
				.in('child_id', childIds.slice(i, i + CHUNK));

			if (cycleId) {
				query = query.eq('cycle_id', cycleId);
			}

			const { data, error } = await query;
			if (error) {
				console.error(
					'GET /api/incidents/ministry-scope: Error reading enrollments:',
					error
				);
				return NextResponse.json(
					{ error: 'Failed to read ministry memberships' },
					{ status: 500 }
				);
			}

			for (const row of data || []) {
				if (row.child_id && row.ministry_id) {
					pairs.push({ child_id: row.child_id, ministry_id: row.ministry_id });
				}
			}
		}

		return NextResponse.json({ pairs });
	} catch (error) {
		console.error('GET /api/incidents/ministry-scope: Unexpected error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
