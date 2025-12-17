import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
	try {
		// Get all auth users with pagination
		// Supabase defaults to 50 users per page, so we need to paginate through all pages
		const allUsers: any[] = [];
		let page = 1;
		const perPage = 1000; // Maximum per page to minimize requests
		let hasMore = true;
		const maxPages = 100; // Safety limit to prevent infinite loops

		while (hasMore && page <= maxPages) {
			const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
				page,
				perPage,
			});

			if (usersError) {
				return NextResponse.json(
					{ error: `Failed to fetch users: ${usersError.message}` },
					{ status: 500 }
				);
			}

			if (usersData?.users && usersData.users.length > 0) {
				allUsers.push(...usersData.users);
				// Check if there are more pages
				// If we got fewer users than perPage, we've reached the end
				hasMore = usersData.users.length === perPage;
				page++;
			} else {
				hasMore = false;
			}
		}

		if (page > maxPages) {
			console.warn(
				`Reached maximum page limit (${maxPages}). There may be more users not fetched.`
			);
		}

		// Get all user_households to find which users are already connected
		const { data: userHouseholds, error: householdsError } = await supabase
			.from('user_households')
			.select('auth_user_id');

		if (householdsError) {
			return NextResponse.json(
				{ error: `Failed to fetch user households: ${householdsError.message}` },
				{ status: 500 }
			);
		}

		// Get set of user IDs that are already connected to households
		const connectedUserIds = new Set(
			(userHouseholds || []).map((uh) => uh.auth_user_id)
		);

		// Filter to only users NOT connected to any household
		const availableUsers = allUsers
			.filter((user) => !connectedUserIds.has(user.id))
			.map((user) => ({
				id: user.id,
				email: user.email || '',
				name: user.user_metadata?.full_name || user.email || 'Unknown',
				role: user.user_metadata?.role || 'GUEST',
			}));

		return NextResponse.json({ users: availableUsers });
	} catch (error) {
		console.error('Error fetching available users:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Internal server error',
			},
			{ status: 500 }
		);
	}
}

