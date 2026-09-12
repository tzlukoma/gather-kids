import 'server-only';
import { getBoolean } from '@/lib/flags';
import { auth } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import RegisterWizard from '@/components/gatherKids/registration-wizard';
import RegisterPageLegacy from './legacy-page';

/**
 * Server wrapper that evaluates the gathersystem_registration flag
 * and renders either the new wizard or legacy form.
 */
export default async function RegisterPageGS() {
	const session = await auth();
	const userId = session?.user?.id ?? null;
	const userRole = session?.user?.user_metadata?.role ?? null;

	// Evaluate the gathersystem_registration flag (default false = legacy)
	let useWizard = false;
	try {
		useWizard = await getBoolean('gathersystem_registration', false, {
			userId,
			role: userRole,
		});
	} catch (error) {
		console.error('Failed to evaluate gathersystem_registration flag:', error);
		// Fall back to legacy on flag evaluation error
	}

	if (useWizard) {
		return <RegisterWizard />;
	}

	return <RegisterPageLegacy />;
}
