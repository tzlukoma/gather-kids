import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
	try {
		// Get all auth users
		const { data, error } = await supabase.auth.admin.listUsers();

		if (error) {
			console.error('Error fetching users:', error);
			return NextResponse.json(
				{ error: `Failed to fetch users: ${error.message}` },
				{ status: 500 }
			);
		}

		// Transform users data
		const users = data.users.map((user) => ({
			id: user.id,
			email: user.email || '',
			role: user.user_metadata?.role || 'GUEST',
			name: user.user_metadata?.full_name || user.email || 'Unknown',
			email_confirmed: !!user.email_confirmed_at,
			last_sign_in: user.last_sign_in_at,
			created_at: user.created_at,
			user_metadata: user.user_metadata,
		}));

		return NextResponse.json({ users });
	} catch (error) {
		console.error('Unexpected error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { userId, role } = await request.json();

		if (!userId || !role) {
			return NextResponse.json(
				{ error: 'Missing userId or role' },
				{ status: 400 }
			);
		}

		// Get current user data to preserve existing metadata
		const { data: currentUser, error: fetchError } = await supabase.auth.admin.getUserById(userId);
		
		if (fetchError) {
			console.error('Error fetching user:', fetchError);
			return NextResponse.json(
				{ error: `Failed to fetch user: ${fetchError.message}` },
				{ status: 500 }
			);
		}

		// Update user metadata to set new role
		const { error } = await supabase.auth.admin.updateUserById(userId, {
			user_metadata: {
				...currentUser.user.user_metadata,
				role: role
			}
		});

		if (error) {
			console.error('Error updating user:', error);
			return NextResponse.json(
				{ error: `Failed to update user: ${error.message}` },
				{ status: 500 }
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Unexpected error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
