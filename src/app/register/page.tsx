import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getBoolean } from '@/lib/flags';
import { isGatherSystemRegistrationOverrideEnabled } from '@/lib/flags/gathersystem-registration-override';
import { isOfflineSupabase } from '@/lib/offline-supabase';
import { AuthRole } from '@/lib/auth-types';
import RegisterWizard from '@/components/gatherKids/registration-wizard';
import RegisterPageLegacy from './page-legacy';

function isWizardFlagOverrideEnabled(): boolean {
	return isGatherSystemRegistrationOverrideEnabled();
}

type RegisterPageContext = {
	useWizard: boolean;
	isOffline: boolean;
	userId: string | undefined;
};

async function getRegisterPageContext(): Promise<RegisterPageContext> {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	const isOffline = isOfflineSupabase();

	if (!url || !anonKey) {
		return { useWizard: false, isOffline, userId: undefined };
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

	let useWizard = false;
	try {
		useWizard =
			(await getBoolean('gathersystem_registration', false, { userId, role })) ||
			isWizardFlagOverrideEnabled();
	} catch (error) {
		console.error('Failed to evaluate gathersystem_registration flag:', error);
	}

	return { useWizard, isOffline, userId };
}

/**
 * Server wrapper that evaluates the gathersystem_registration flag
 * and renders either the new wizard or legacy form.
 */
export default async function RegisterPage() {
	const { useWizard, isOffline, userId } = await getRegisterPageContext();

	if (!useWizard) {
		return <RegisterPageLegacy />;
	}

	if (!userId && !isOffline) {
		redirect(`/login?next=${encodeURIComponent('/register')}`);
	}

	return <RegisterWizard />;
}

export {
	getRegisterPageContext,
	isGatherSystemRegistrationOverrideEnabled,
	isWizardFlagOverrideEnabled,
};
