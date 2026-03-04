import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
	try {
		const authResult = await requireAdmin();
		if (!authResult.authorized) {
			return authResult.response;
		}

		const body = await request.json();
		const { email, password, full_name, role, email_confirm } = body;

		if (!email || typeof email !== 'string') {
			return NextResponse.json(
				{ error: 'Missing or invalid email' },
				{ status: 400 }
			);
		}
		if (!password || typeof password !== 'string') {
			return NextResponse.json(
				{ error: 'Missing or invalid password' },
				{ status: 400 }
			);
		}
		if (password.length < MIN_PASSWORD_LENGTH) {
			return NextResponse.json(
				{ error: 'Password must be at least 8 characters' },
				{ status: 400 }
			);
		}
		if (!emailRegex.test(email)) {
			return NextResponse.json(
				{ error: 'Invalid email format' },
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
		const name = full_name && typeof full_name === 'string' ? full_name : email;

		const { data: authData, error: authError } = await supabase.auth.admin.createUser({
			email,
			password,
			email_confirm: !!email_confirm,
			user_metadata: {
				role: role || 'GUEST',
				full_name: name,
			},
		});

		if (authError) {
			const message = authError.message || '';
			const status = message.toLowerCase().includes('already') ? 409 : 400;
			return NextResponse.json(
				{ error: authError.message },
				{ status }
			);
		}

		if (!authData?.user) {
			return NextResponse.json(
				{ error: 'User creation failed' },
				{ status: 500 }
			);
		}

		const { error: dbError } = await supabase.from('users').upsert({
			user_id: authData.user.id,
			name,
			email: authData.user.email || email,
			role: authData.user.user_metadata?.role || 'GUEST',
			is_active: true,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		});

		if (dbError) {
			return NextResponse.json(
				{
					success: true,
					warning:
						'User created in auth but database sync failed. The user can sign in but may need manual database entry.',
					user: {
						id: authData.user.id,
						email: authData.user.email,
						user_metadata: authData.user.user_metadata,
					},
				},
				{ status: 200 }
			);
		}

		return NextResponse.json({
			success: true,
			user: {
				id: authData.user.id,
				email: authData.user.email,
				user_metadata: authData.user.user_metadata,
			},
		});
	} catch (error) {
		console.error('Unexpected error in POST /api/users/create:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
