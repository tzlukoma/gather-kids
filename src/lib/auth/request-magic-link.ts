import { supabase } from '@/lib/supabaseClient';

export const MAGIC_LINK_ERROR = 'We could not send a secure link. Please try again.';

/**
 * Emails a sign-in link that signs in an existing account or starts a new one.
 *
 * Requested from the browser so the PKCE code verifier is stored where
 * /auth/callback exchanges the code; a server-side request cannot be
 * completed. The path-only callback URL matches a path-only Supabase redirect
 * allowlist on Preview deployments.
 *
 * Throws `MAGIC_LINK_ERROR` on failure. The message never says whether an
 * account exists for the address.
 */
export async function requestMagicLink(email: string): Promise<void> {
	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: {
			emailRedirectTo: `${window.location.origin}/auth/callback`,
			shouldCreateUser: true,
		},
	});
	if (error) {
		throw new Error(MAGIC_LINK_ERROR);
	}
	// UX-only marker consumed after an authenticated callback. It does not
	// authorize anything and is scoped to the one callback route.
	document.cookie = `gk_account_entry_flow=1; Path=/auth/callback; Max-Age=${10 * 60}; SameSite=Lax`;
}
