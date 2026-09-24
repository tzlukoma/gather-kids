import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';
import { gradeToCode } from '@/lib/gradeUtils';

/**
 * Enroll a registered child in the active Bible Bee cycle.
 *
 * Registration used to do this from the browser, as the family: it chose the
 * cycle and division itself and inserted the `bible_bee_enrollments` row
 * directly. #527 decided families may not write Bible Bee records, and a
 * division picked by the client is a division the client could pick wrongly
 * on purpose. So the enrollment is decided here.
 *
 * The caller names a child and nothing else. The route checks the caller may
 * act for that child (a member of the child's household, or an admin), that
 * the child is signed up for the Bible Bee ministry, and then derives the cycle
 * and the division from the child's grade — the same rule registration used.
 *
 * Idempotent: a child already enrolled in the cycle keeps that enrollment.
 */

function getSupabaseAdmin(): SupabaseClient | null {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !supabaseServiceKey) {
		return null;
	}
	return createClient(supabaseUrl, supabaseServiceKey);
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest) {
	try {
		const auth = await requireUser();
		if (!auth.authorized) {
			return auth.response;
		}

		let body: { childId?: unknown };
		try {
			body = await request.json();
		} catch {
			return fail(400, 'A JSON body is required');
		}
		const childId = typeof body.childId === 'string' ? body.childId.trim() : '';
		if (!childId) {
			return fail(400, '`childId` is required');
		}

		const supabase = getSupabaseAdmin();
		if (!supabase) {
			console.error(
				'POST /api/bible-bee/enroll: Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL'
			);
			return fail(503, 'Server configuration error');
		}

		const { data: child, error: childError } = await supabase
			.from('children')
			.select('child_id, household_id, grade')
			.eq('child_id', childId)
			.maybeSingle();
		if (childError) {
			console.error('POST /api/bible-bee/enroll: child lookup failed', childError);
			return fail(500, 'Failed to enroll in Bible Bee');
		}

		// A child the caller may not act for gets the same answer as a child
		// that does not exist, so the route cannot be used to test ids.
		let permitted = auth.role === 'ADMIN';
		if (!permitted && child?.household_id) {
			const { data: link, error: linkError } = await supabase
				.from('user_households')
				.select('household_id')
				.eq('auth_user_id', auth.userId)
				.eq('household_id', child.household_id)
				.maybeSingle();
			if (linkError) {
				console.error('POST /api/bible-bee/enroll: household link lookup failed', linkError);
				return fail(500, 'Failed to enroll in Bible Bee');
			}
			permitted = !!link;
		}
		if (!child || !permitted) {
			return fail(404, 'Child not found');
		}

		// Registration creates the ministry enrollment first; this only follows it.
		const { data: signedUp, error: signedUpError } = await supabase
			.from('ministry_enrollments')
			.select('enrollment_id, ministries!inner(code)')
			.eq('child_id', childId)
			.eq('ministries.code', 'bible-bee')
			.limit(1);
		if (signedUpError) {
			console.error('POST /api/bible-bee/enroll: ministry enrollment lookup failed', signedUpError);
			return fail(500, 'Failed to enroll in Bible Bee');
		}
		if (!signedUp || signedUp.length === 0) {
			return fail(409, 'Child is not signed up for Bible Bee');
		}

		const { data: cycles, error: cycleError } = await supabase
			.from('bible_bee_cycles')
			.select('id')
			.eq('is_active', true)
			.order('created_at', { ascending: false })
			.limit(1);
		if (cycleError) {
			console.error('POST /api/bible-bee/enroll: cycle lookup failed', cycleError);
			return fail(500, 'Failed to enroll in Bible Bee');
		}
		const cycleId = cycles?.[0]?.id as string | undefined;
		if (!cycleId) {
			return NextResponse.json({ enrolled: false, reason: 'no_active_cycle' });
		}

		const { data: divisions, error: divisionError } = await supabase
			.from('divisions')
			.select('id, min_grade, max_grade')
			.eq('bible_bee_cycle_id', cycleId);
		if (divisionError) {
			console.error('POST /api/bible-bee/enroll: division lookup failed', divisionError);
			return fail(500, 'Failed to enroll in Bible Bee');
		}
		// Unchanged from registration: no grade counts as kindergarten.
		const gradeNum = child.grade ? gradeToCode(child.grade) : 0;
		const division = (divisions ?? []).find(
			(d) => gradeNum !== null && gradeNum >= d.min_grade && gradeNum <= d.max_grade
		);
		if (!division) {
			return NextResponse.json({ enrolled: false, reason: 'no_division_for_grade' });
		}

		const { error: enrollError } = await supabase.from('bible_bee_enrollments').upsert(
			{
				child_id: childId,
				bible_bee_cycle_id: cycleId,
				division_id: division.id,
				auto_enrolled: false,
				enrolled_at: new Date().toISOString(),
			},
			{ onConflict: 'bible_bee_cycle_id,child_id', ignoreDuplicates: true }
		);
		if (enrollError) {
			console.error('POST /api/bible-bee/enroll: enrollment insert failed', enrollError);
			return fail(500, 'Failed to enroll in Bible Bee');
		}

		// Report what is stored, not what was computed: a child already enrolled
		// in this cycle keeps the division they have.
		const { data: stored, error: storedError } = await supabase
			.from('bible_bee_enrollments')
			.select('division_id')
			.eq('child_id', childId)
			.eq('bible_bee_cycle_id', cycleId)
			.maybeSingle();
		if (storedError || !stored) {
			console.error('POST /api/bible-bee/enroll: enrollment read-back failed', storedError);
			return fail(500, 'Failed to enroll in Bible Bee');
		}

		const { error: assignError } = await supabase.rpc('ensure_student_assignments', {
			p_child_id: childId,
		});
		if (assignError) {
			// The enrollment stands; the child's page creates the rows on first view.
			console.warn('POST /api/bible-bee/enroll: assignment creation failed', assignError);
		}

		return NextResponse.json({ enrolled: true, cycleId, divisionId: stored.division_id });
	} catch (error) {
		console.error('POST /api/bible-bee/enroll: unexpected failure', error);
		return fail(500, 'Failed to enroll in Bible Bee');
	}
}
