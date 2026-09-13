/**
 * Local/e2e escape hatch when PostHog flag evaluation is unavailable.
 * Must never enable the wizard for all users in production.
 */
export function isGatherSystemRegistrationOverrideEnabled(
	nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
	return (
		nodeEnv !== 'production' &&
		process.env.GATHERSYSTEM_REGISTRATION_OVERRIDE === 'true'
	);
}
