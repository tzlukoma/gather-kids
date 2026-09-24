import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';

/**
 * Create the household a registration is about, and link it to the caller.
 *
 * Registration used to create the household in the browser and then ask the
 * server to link the id it had chosen. That left `POST /api/household/link`
 * unable to refuse the one case it could not verify: a household with no link
 * yet could be claimed by any signed-in caller who learned its id. No check the
 * route could run closed that, because every property it might verify lives in
 * a table the browser can write (#495).
 *
 * So the id stops coming from the client. The household row and its
 * `user_households` link are created here, together, from the session's own
 * auth user — and a household that is linked from the moment it exists is never
 * claimable.
 *
 * The caller may not supply a household id, an auth user, or anything else that
 * decides ownership. Everything in the body is descriptive: name and address.
 *
 * One call per account: a caller who already has a household gets that
 * household back rather than a second one, so a retried or double-submitted
 * registration cannot fork a family in two.
 */

function getSupabaseAdmin(): SupabaseClient | null {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !supabaseServiceKey) {
		return null;
	}
	return createClient(supabaseUrl, supabaseServiceKey);
}

type HouseholdBody = {
	name?: unknown;
	address_line1?: unknown;
	address_line2?: unknown;
	city?: unknown;
	state?: unknown;
	zip?: unknown;
	email?: unknown;
	primary_phone?: unknown;
	preferred_scripture_translation?: unknown;
};

/** Only the descriptive fields. Anything else the caller sends is dropped. */
function describedFields(body: HouseholdBody) {
	const text = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : null);
	return {
		name: text(body.name),
		address_line1: text(body.address_line1),
		address_line2: text(body.address_line2),
		city: text(body.city),
		state: text(body.state),
		zip: text(body.zip),
		email: text(body.email),
		primary_phone: text(body.primary_phone),
		preferred_scripture_translation: text(body.preferred_scripture_translation),
	};
}

export async function POST(request: NextRequest) {
	try {
		const auth = await requireUser();
		if (!auth.authorized) {
			return auth.response;
		}

		let body: HouseholdBody;
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ error: 'A JSON body is required' }, { status: 400 });
		}

		const fields = describedFields(body);
		if (!fields.name) {
			return NextResponse.json({ error: '`name` is required' }, { status: 400 });
		}

		const supabase = getSupabaseAdmin();
		if (!supabase) {
			console.error(
				'POST /api/household: Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL'
			);
			return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
		}

		// A second registration from the same account returns the household it
		// already has. Creating another would split the family across two.
		const { data: existing, error: existingError } = await supabase
			.from('user_households')
			.select('household_id')
			.eq('auth_user_id', auth.userId)
			.maybeSingle();

		if (existingError) {
			console.error('POST /api/household: existing link lookup failed', existingError);
			return NextResponse.json({ error: 'Failed to create household' }, { status: 500 });
		}

		if (existing?.household_id) {
			return NextResponse.json({ householdId: existing.household_id, created: false });
		}

		// `households.household_id` carries no database default — the browser
		// adapter always supplied one. Generating it here is the substance of
		// this change, not a detail: an id the client never chose is an id the
		// client cannot have aimed at someone else's family.
		const now = new Date().toISOString();
		const { data: household, error: householdError } = await supabase
			.from('households')
			.insert({ ...fields, household_id: randomUUID(), created_at: now, updated_at: now })
			.select('household_id')
			.single();

		if (householdError || !household?.household_id) {
			console.error('POST /api/household: household insert failed', householdError);
			return NextResponse.json({ error: 'Failed to create household' }, { status: 500 });
		}

		const { error: linkError } = await supabase
			.from('user_households')
			.insert({ auth_user_id: auth.userId, household_id: household.household_id });

		if (linkError) {
			// The household exists but nobody can reach it, which is exactly the
			// unclaimed row this route was written to stop creating. Remove it.
			console.error('POST /api/household: link insert failed, rolling back', linkError);
			await supabase.from('households').delete().eq('household_id', household.household_id);
			return NextResponse.json({ error: 'Failed to create household' }, { status: 500 });
		}

		return NextResponse.json({ householdId: household.household_id, created: true });
	} catch (error) {
		console.error('POST /api/household: unexpected failure', error);
		return NextResponse.json({ error: 'Failed to create household' }, { status: 500 });
	}
}
