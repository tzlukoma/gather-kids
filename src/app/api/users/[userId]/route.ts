import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MIN_PASSWORD_LENGTH = 8;

type Params = { params: Promise<{ userId: string }> | { userId: string } };

export async function PATCH(
	request: NextRequest,
	context: Params
) {
	try {
		const authResult = await requireAdmin();
		if (!authResult.authorized) {
			return authResult.response;
		}

		const params = await (Promise.resolve(context.params) as Promise<{ userId: string }>);
		const userId = params.userId;

		const body = await request.json();
		const { role, email_confirmed, password } = body;

		const hasRole = role !== undefined && role !== null;
		const hasEmailConfirmed = email_confirmed !== undefined && email_confirmed !== null;
		const hasPassword = password !== undefined && password !== null;

		if (!hasRole && !hasEmailConfirmed && !hasPassword) {
			return NextResponse.json(
				{ error: 'At least one of role, email_confirmed, or password is required' },
				{ status: 400 }
			);
		}

		if (hasPassword && (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH)) {
			return NextResponse.json(
				{ error: 'Password must be at least 8 characters' },
				{ status: 400 }
			);
		}

		if (!supabaseUrl || !supabaseServiceKey) {
			return NextResponse.json(
				{ error: 'Missing Supabase configuration' },
				{ status: 500 }
			);
		}

		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		const { data: currentUserData, error: fetchError } = await supabase.auth.admin.getUserById(userId);
		if (fetchError || !currentUserData?.user) {
			return NextResponse.json(
				{ error: fetchError?.message || 'User not found' },
				{ status: 404 }
			);
		}

		const existingMetadata = currentUserData.user.user_metadata || {};
		const updatePayload: {
			password?: string;
			email_confirmed_at?: string;
			user_metadata?: Record<string, unknown>;
		} = {};

		if (hasPassword) {
			updatePayload.password = password;
		}
		if (hasEmailConfirmed && email_confirmed === true) {
			updatePayload.email_confirmed_at = new Date().toISOString();
		}
		if (hasRole) {
			updatePayload.user_metadata = {
				...existingMetadata,
				role: String(role),
			};
		} else if (hasEmailConfirmed || hasPassword) {
			updatePayload.user_metadata = existingMetadata;
		}

		const { error: updateError } = await supabase.auth.admin.updateUserById(userId, updatePayload);
		if (updateError) {
			return NextResponse.json(
				{ error: updateError.message },
				{ status: 500 }
			);
		}

		if (hasRole) {
			const { error: dbError } = await supabase
				.from('users')
				.update({
					role: String(role),
					updated_at: new Date().toISOString(),
				})
				.eq('user_id', userId);
			if (dbError) {
				console.error('Failed to sync role to public users table:', dbError);
			}
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Unexpected error in PATCH /api/users/[userId]:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
