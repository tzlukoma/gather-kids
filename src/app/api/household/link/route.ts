import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';

/**
 * Link the signed-in user to the household their registration just created.
 *
 * `user_households` decides which household's data a guardian may see, so it
 * must not be writable from the browser: a signed-in user who can repoint their
 * own row can point it at any family. The migration
 * `20260921170000_protect_user_households_writes` revokes those grants, and
 * this route is where the one legitimate write goes instead.
 *
 * The auth user is taken from the validated JWT, never the request body. The
 * household id has to come from the caller — registration creates the household
 * in the browser — so two rules stand in for ownership we cannot yet prove:
 *
 *   1. A caller who already has a link keeps it. The link is created once and
 *      is not repointable, which is the specific attack this closes.
 *   2. A household already linked to a different auth user is refused, so an
 *      existing family cannot be claimed.
 *
 * **Registration no longer calls this for a new household.** `POST
 * /api/household` creates the household and its link together, so the id never
 * comes from the browser and no unlinked household is created (#496). By the
 * time this route would run, `getHouseholdForUser` already returns a link and
 * the call is skipped.
 *
 * **The one caller left, and what it still cannot establish.** A *returning*
 * guardian whose household predates their account arrives with a household id
 * from the registration prefill and no link. This route creates it — and it
 * cannot verify that the household is theirs. A household with no link yet can
 * still be claimed by any signed-in caller who learns its id. Proving ownership
 * needs a source the client cannot forge; the proposal is an emailed link to
 * the address already on file, which is #497. Removing this route before that
 * lands would strand those families, because every household lookup in the app
 * goes through the link.
 */

function getSupabaseAdmin(): SupabaseClient | null {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !supabaseServiceKey) {
		return null;
	}
	return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
	try {
		const auth = await requireUser();
		if (!auth.authorized) {
			return auth.response;
		}

		let body: { householdId?: unknown };
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ error: 'A JSON body is required' }, { status: 400 });
		}

		const householdId = body.householdId;
		if (typeof householdId !== 'string' || householdId.trim() === '') {
			return NextResponse.json({ error: '`householdId` is required' }, { status: 400 });
		}

		const supabase = getSupabaseAdmin();
		if (!supabase) {
			console.error(
				'POST /api/household/link: Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL'
			);
			return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
		}

		const { data: existing, error: existingError } = await supabase
			.from('user_households')
			.select('household_id')
			.eq('auth_user_id', auth.userId)
			.maybeSingle();

		if (existingError) {
			console.error('POST /api/household/link: existing link lookup failed', existingError);
			return NextResponse.json({ error: 'Failed to link household' }, { status: 500 });
		}

		// Idempotent for the caller's own household, and a refusal — not a
		// silent repoint — for anything else. Registration retries land here.
		if (existing?.household_id) {
			if (existing.household_id === householdId) {
				return NextResponse.json({ householdId: existing.household_id, created: false });
			}
			return NextResponse.json(
				{ error: 'This account is already linked to a household' },
				{ status: 409 }
			);
		}

		const { data: claimed, error: claimedError } = await supabase
			.from('user_households')
			.select('auth_user_id')
			.eq('household_id', householdId)
			.limit(1);

		if (claimedError) {
			console.error('POST /api/household/link: household lookup failed', claimedError);
			return NextResponse.json({ error: 'Failed to link household' }, { status: 500 });
		}

		if ((claimed ?? []).length > 0) {
			return NextResponse.json(
				{ error: 'That household is already linked to another account' },
				{ status: 403 }
			);
		}

		const { error: insertError } = await supabase.from('user_households').insert({
			auth_user_id: auth.userId,
			household_id: householdId,
		});

		if (insertError) {
			console.error('POST /api/household/link: insert failed', insertError);
			return NextResponse.json({ error: 'Failed to link household' }, { status: 500 });
		}

		return NextResponse.json({ householdId, created: true });
	} catch (error) {
		console.error('POST /api/household/link: unexpected failure', error);
		return NextResponse.json({ error: 'Failed to link household' }, { status: 500 });
	}
}
