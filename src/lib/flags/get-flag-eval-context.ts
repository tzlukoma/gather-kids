import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AuthRole } from '@/lib/auth-types';
import { isOfflineSupabase } from '@/lib/offline-supabase';

/**
 * Opaque auth context for server-side `getBoolean` / `getVariant` calls.
 * Never includes email, name, household, or child identifiers.
 */
export type FlagServerEvalContext = {
	userId: string | undefined;
	role: AuthRole | undefined;
	isOffline: boolean;
	/**
	 * False when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	 * is missing — callers must not evaluate flags (legacy / fail closed).
	 */
	canEvaluateFlags: boolean;
};

/**
 * Shared server helper: read session via getAll-only cookies + `getUser()`,
 * return opaque `{ userId, role }` (plus `isOffline`) for flag evaluation.
 *
 * Missing Supabase public env → no client, `canEvaluateFlags: false`.
 * Session refresh stays in `src/proxy.ts` (full `setAll` adapter).
 */
export async function getFlagEvalContext(): Promise<FlagServerEvalContext> {
	const isOffline = isOfflineSupabase();
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !anonKey) {
		return {
			userId: undefined,
			role: undefined,
			isOffline,
			canEvaluateFlags: false,
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

	const {
		data: { user },
	} = await supabase.auth.getUser();

	return {
		userId: user?.id,
		role: user?.user_metadata?.role as AuthRole | undefined,
		isOffline,
		canEvaluateFlags: true,
	};
}
