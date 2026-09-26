export type PasswordStatus = 'has_password' | 'no_password' | 'unknown';

/** Supabase's default magic-link lifetime (`mailer_otp_exp`). */
const MAGIC_LINK_LIFETIME_MS = 60 * 60 * 1000;

/**
 * Whether a user signing in with a magic link already has a password.
 *
 * Supabase cannot answer this: accounts created by a magic link get a random
 * password, so `auth.users` holds a hash either way. The app records
 * `user_metadata.has_password` wherever a password is set or used (sign-up,
 * onboarding, settings, reset, password sign-in), so `true` is reliable.
 *
 * Its absence is not: accounts from before that recording began lack it too.
 * An account younger than a magic link's lifetime was created by the link
 * being used now, so it has no password of its own. Anything older is
 * `unknown`, and the password step is then offered rather than forced.
 */
export function getPasswordStatus(
	user: { user_metadata?: Record<string, unknown>; created_at?: string },
	now: number = Date.now()
): PasswordStatus {
	if (user.user_metadata?.has_password === true) return 'has_password';

	const createdAt = user.created_at ? Date.parse(user.created_at) : NaN;
	if (!Number.isNaN(createdAt) && now - createdAt < MAGIC_LINK_LIFETIME_MS) {
		return 'no_password';
	}
	return 'unknown';
}

/**
 * Where a magic-link account-entry user without a household goes next.
 * Someone with a password is already signed in and goes straight to
 * registration. Password creation is required only for accounts this link
 * just created; when we cannot tell, it is offered but skippable, so nobody is
 * made to replace a password they already have.
 */
export function accountEntryRegistrationRoute(status: PasswordStatus): string {
	switch (status) {
		case 'has_password':
			return '/register';
		case 'no_password':
			return '/onboarding?next=/register';
		default:
			return '/onboarding?next=/register&password=optional';
	}
}
