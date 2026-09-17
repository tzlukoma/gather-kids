import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * The parts of a Supabase auth user this module needs. Declared locally rather
 * than imported, because `@supabase/supabase-js` is restricted outside the DAL
 * and API layers.
 */
interface AuthUser {
	id: string;
	app_metadata?: Record<string, unknown>;
	user_metadata?: Record<string, unknown>;
}

/**
 * Role resolution for **GatherSystem** API routes.
 *
 * The role is read from `app_metadata`, never `user_metadata`. Supabase lets a
 * signed-in user rewrite their own `user_metadata` with a plain
 * `auth.updateUser({ data: … })` call, so a role claim stored there is
 * self-asserted: anyone could grant themselves ADMIN. `app_metadata` can only
 * be written by the service role, through the admin API.
 *
 * Fails closed. A user with no `app_metadata.role` is treated as GUEST rather
 * than falling back to the self-asserted claim, which would reopen the hole.
 *
 * **Only `requireUser` uses this, and only flag-gated routes call
 * `requireUser`.** `requireAdmin` below still reads `user_metadata`, exactly as
 * on `main`: moving it would 403 every existing admin until
 * `scripts/backfill-app-metadata-roles.mjs --apply` had been run against the
 * environment, which is a change to the default path. That fix belongs in its
 * own PR with its own backfill window. Run the backfill before enabling
 * `gathersystem_incidents`, or admins will see the new screen scoped as
 * leaders — narrower, never wider.
 */
export function resolveTrustedRole(user: Pick<AuthUser, 'app_metadata'>): string {
	const role = user.app_metadata?.role;
	return typeof role === 'string' && role.length > 0 ? role : 'GUEST';
}

async function getAuthenticatedUser(): Promise<
	{ ok: true; user: AuthUser } | { ok: false; response: NextResponse }
> {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !anonKey) {
		console.error(
			'api-auth: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
		);
		return {
			ok: false,
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
	if (error || !user) {
		return {
			ok: false,
			response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
		};
	}

	return { ok: true, user };
}

export async function requireAdmin(): Promise<
	| { authorized: true; user: AuthUser }
	| { authorized: false; response: NextResponse }
> {
	const result = await getAuthenticatedUser();
	if (!result.ok) {
		// Preserve the historical 403 for this helper rather than leaking whether
		// the caller was unauthenticated or merely not an admin.
		return {
			authorized: false,
			response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }),
		};
	}

	// Deliberately still `user_metadata`, matching `main`. See `resolveTrustedRole`.
	if (result.user.user_metadata?.role !== 'ADMIN') {
		return {
			authorized: false,
			response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }),
		};
	}

	return { authorized: true, user: result.user };
}

/**
 * Authenticate the caller without demanding a particular role.
 *
 * `userId` comes from the JWT that `getUser()` validated server-side, and
 * `role` from the service-role-owned `app_metadata`. Scope queries by these,
 * never by anything the request supplied.
 */
export async function requireUser(): Promise<
	| { authorized: true; userId: string; role: string }
	| { authorized: false; response: NextResponse }
> {
	const result = await getAuthenticatedUser();
	if (!result.ok) {
		return { authorized: false, response: result.response };
	}

	return {
		authorized: true,
		userId: result.user.id,
		role: resolveTrustedRole(result.user),
	};
}
