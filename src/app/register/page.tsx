import 'server-only';
import { redirect } from 'next/navigation';
import { getBoolean } from '@/lib/flags';
import { getFlagEvalContext } from '@/lib/flags/get-flag-eval-context';
import { isGatherSystemRegistrationOverrideEnabled } from '@/lib/flags/gathersystem-registration-override';
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
	const { userId, role, isOffline, canEvaluateFlags } =
		await getFlagEvalContext();

	if (!canEvaluateFlags) {
		return { useWizard: false, isOffline, userId: undefined };
	}

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
