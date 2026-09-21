import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';

/**
 * Today's attendance for the signed-in guardian's own children.
 *
 * The guardian home shows each child's on-site state. That read cannot happen
 * in the browser. `attendance` has no RLS, and the browser holds an anon-key
 * Supabase client, so a client-side query is scoped only by what the client
 * chooses to ask for — which is to say, not scoped at all. Filtering a
 * browser-supplied child list is payload shaping, not authorization.
 *
 * So the caller sends a date and nothing else. The household is derived here
 * from `auth_user_id`, the children from that household, and the attendance
 * rows from those children. **Any `childIds` in the query string are ignored**
 * — there is deliberately no parameter to honour, so a forged one is inert
 * rather than merely rejected.
 *
 * Only `child_id` and `check_out_at` are returned. `derivePresence` needs those
 * two fields; `checked_in_by`, `picked_up_by`, `notes` and the rest have no
 * business on a summary screen.
 *
 * This closes the read this screen introduced. It does not close the wider
 * problem — RLS is off across `children`, `households` and `guardians`, and
 * `src/lib/database/factory.ts` publishes the adapter as
 * `window.gatherKidsDbAdapter` — which is tracked separately.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

		const date = request.nextUrl.searchParams.get('date');
		if (!date || !ISO_DATE.test(date)) {
			return NextResponse.json(
				{ error: 'A `date` of the form YYYY-MM-DD is required' },
				{ status: 400 }
			);
		}

		const supabase = getSupabaseAdmin();
		if (!supabase) {
			console.error(
				'GET /api/household/attendance: Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL'
			);
			return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
		}

		// `auth.userId` is the id from the JWT `getUser()` validated server-side.
		const { data: link, error: linkError } = await supabase
			.from('user_households')
			.select('household_id')
			.eq('auth_user_id', auth.userId)
			.maybeSingle();

		if (linkError) {
			console.error('GET /api/household/attendance: household lookup failed', linkError);
			return NextResponse.json({ error: 'Failed to load attendance' }, { status: 500 });
		}

		// A signed-in user with no household is not an error — a leader or an
		// admin has no household of their own. They get an empty list, not
		// somebody else's children.
		if (!link?.household_id) {
			return NextResponse.json({ attendance: [] });
		}

		const { data: children, error: childrenError } = await supabase
			.from('children')
			.select('child_id, is_active')
			.eq('household_id', link.household_id);

		if (childrenError) {
			console.error('GET /api/household/attendance: children lookup failed', childrenError);
			return NextResponse.json({ error: 'Failed to load attendance' }, { status: 500 });
		}

		// `is_active !== false` rather than `=== true`: a null reads as active,
		// which is what `buildChildRows` does, so the two agree about who is in
		// the household.
		const childIds = (children ?? [])
			.filter((child) => child.is_active !== false)
			.map((child) => child.child_id);

		if (childIds.length === 0) {
			return NextResponse.json({ attendance: [] });
		}

		const { data: rows, error: rowsError } = await supabase
			.from('attendance')
			.select('child_id, check_out_at')
			.eq('date', date)
			.in('child_id', childIds);

		if (rowsError) {
			console.error('GET /api/household/attendance: attendance lookup failed', rowsError);
			return NextResponse.json({ error: 'Failed to load attendance' }, { status: 500 });
		}

		return NextResponse.json({ attendance: rows ?? [] });
	} catch (error) {
		console.error('GET /api/household/attendance: unexpected failure', error);
		return NextResponse.json({ error: 'Failed to load attendance' }, { status: 500 });
	}
}
