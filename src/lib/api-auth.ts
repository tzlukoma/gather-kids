import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function requireAdmin(): Promise<
	| { authorized: true; user: { user_metadata?: { role?: string } } }
	| { authorized: false; response: NextResponse }
> {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !anonKey) {
		console.error('requireAdmin: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
		return {
			authorized: false,
			response: NextResponse.json({ error: 'Server configuration error' }, { status: 503 }),
		};
	}

	const cookieStore = await cookies();
	const supabase = createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
		},
	});

	// getUser() validates the JWT server-side via a network call to Supabase,
	// unlike getSession() which needs to refresh tokens and write cookies.
	const { data: { user }, error } = await supabase.auth.getUser();
	if (error || !user || user.user_metadata?.role !== 'ADMIN') {
		return {
			authorized: false,
			response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }),
		};
	}
	return { authorized: true, user };
}
