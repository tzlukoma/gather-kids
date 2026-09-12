import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getBoolean } from '@/lib/flags';
import { AuthRole } from '@/lib/auth-types';
import RegisterWizard from '@/components/gatherKids/registration-wizard';
import RegisterPageLegacy from './page-legacy';

async function getGatherSystemRegistrationFlag(): Promise<boolean> {
	try {
		const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		if (!url || !anonKey) {
			return false;
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
		const userId = user?.id;
		const role = user?.user_metadata?.role as AuthRole | undefined;

		return await getBoolean('gathersystem_registration', false, { userId, role });
	} catch (error) {
		console.error('Failed to evaluate gathersystem_registration flag:', error);
		return false;
	}
}

/**
 * Server wrapper that evaluates the gathersystem_registration flag
 * and renders either the new wizard or legacy form.
 */
export default async function RegisterPage() {
	const useWizard = await getGatherSystemRegistrationFlag();

	if (useWizard) {
		return <RegisterWizard />;
	}

	return <RegisterPageLegacy />;
}
