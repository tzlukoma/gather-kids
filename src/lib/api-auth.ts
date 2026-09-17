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
 * be written by the service role.
 *
 * Fails closed: no `app_metadata.role` means GUEST. There is deliberately no
 * fallback to `user_metadata`, which would reopen the hole.
 *
 * Populated by `POST /api/users/create` and `PATCH /api/users/[userId]`, both
 * guarded by `requireAdmin` below, which now reads this same trusted claim —
 * a privileged writer must never sit behind a guard weaker than the claim it
 * writes, or a forged claim can be laundered into a durable one that survives
 * the repair. Existing accounts are populated once per environment by
 * `scripts/backfill-app-metadata-roles.mjs`.
 */
export function resolveTrustedRole(user: Pick<AuthUser, 'app_metadata'>): string {
	const role = user.app_metadata?.role;
	return typeof role === 'string' && role.length > 0 ? role : 'GUEST';
}

async function getAuthenticatedUser(): Promise<
	| { ok: true; user: AuthUser }
	| { ok: false; reason: 'misconfigured' | 'unauthenticated'; response: NextResponse }
> {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !anonKey) {
		console.error(
			'api-auth: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
		);
		return {
			ok: false,
			reason: 'misconfigured',
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
			reason: 'unauthenticated',
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
		// A misconfigured server is not an authorization outcome and keeps its
		// 503 — collapsing it to 403 would tell an operator their credentials
		// were rejected when the deployment is simply missing its Supabase env.
		// An unauthenticated caller does get 403, matching this helper's
		// historical behaviour, so the response cannot be used to distinguish
		// "not signed in" from "signed in but not an admin".
		if (result.reason === 'misconfigured') {
			return { authorized: false, response: result.response };
		}
		return {
			authorized: false,
			response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }),
		};
	}

	if (resolveTrustedRole(result.user) !== 'ADMIN') {
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
