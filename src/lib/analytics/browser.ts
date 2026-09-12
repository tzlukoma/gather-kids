import posthog from 'posthog-js';
import type { AuthRole } from '@/lib/auth-types';

type Env = Record<string, string | undefined>;

/** Events we are willing to send. Everything else from the wizard was dropped. */
export type AnalyticsEventName =
	| 'account_created'
	| 'registration_submitted'
	| 'child_checked_in'
	| 'child_checked_out'
	| 'bulk_attendance_updated';

export type AnalyticsPropertyValue = string | number | boolean;

const FORBIDDEN_PROPERTY_KEYS = new Set([
	'email',
	'name',
	'displayName',
	'display_name',
	'first_name',
	'last_name',
	'full_name',
	'phone',
	'address',
	'child_id',
	'household_id',
	'photo',
	'dob',
	'date_of_birth',
	'allergy',
	'allergies',
]);

function envValue(value: string | undefined): string | undefined {
	if (value === undefined || value.trim() === '') return undefined;
	return value;
}

export function getAnalyticsDeployEnv(env: Env = process.env): string {
	return (
		envValue(env.NEXT_PUBLIC_DEPLOY_ENV) ||
		envValue(env.VERCEL_ENV) ||
		'development'
	);
}

export function shouldInitBrowserPostHog(env: Env = process.env): boolean {
	if (env.NODE_ENV === 'test' || env.CI === 'true') return false;

	const deployEnv = getAnalyticsDeployEnv(env);
	if (deployEnv !== 'uat' && deployEnv !== 'production') return false;

	return Boolean(
		envValue(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) &&
			envValue(env.NEXT_PUBLIC_POSTHOG_HOST)
	);
}

export function buildAnalyticsDistinctId(
	userId: string,
	env: Env = process.env
): string {
	return `${getAnalyticsDeployEnv(env)}:${userId}`;
}

export function sanitizeAnalyticsProperties(
	properties: Record<string, unknown> | undefined
): Record<string, AnalyticsPropertyValue> {
	if (!properties) return {};

	const sanitized: Record<string, AnalyticsPropertyValue> = {};
	for (const [key, value] of Object.entries(properties)) {
		if (FORBIDDEN_PROPERTY_KEYS.has(key)) continue;
		if (
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean'
		) {
			sanitized[key] = value;
		}
	}
	return sanitized;
}

export function buildIdentifyProperties(role: AuthRole | null | undefined) {
	return {
		role: role ?? 'GUEST',
		deploy_env: getAnalyticsDeployEnv(),
	};
}

export function initBrowserPostHog(): void {
	if (typeof window === 'undefined') return;
	if (!shouldInitBrowserPostHog()) return;

	const token = envValue(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN);
	const host = envValue(process.env.NEXT_PUBLIC_POSTHOG_HOST);
	if (!token || !host) return;

	posthog.init(token, {
		api_host: host,
		defaults: '2026-01-30',
		autocapture: false,
		capture_pageview: false,
		capture_pageleave: false,
		capture_exceptions: false,
		disable_session_recording: true,
		advanced_disable_feature_flags: true,
		person_profiles: 'identified_only',
	});
}

export function identifyAnalyticsUser(input: {
	userId: string;
	role?: AuthRole | null;
}): void {
	if (!input.userId) return;
	if (!shouldInitBrowserPostHog()) return;

	posthog.identify(
		buildAnalyticsDistinctId(input.userId),
		buildIdentifyProperties(input.role)
	);
}

export function resetAnalyticsUser(): void {
	if (!shouldInitBrowserPostHog()) return;
	posthog.reset();
}

export function captureAnalyticsEvent(
	event: AnalyticsEventName,
	properties?: Record<string, unknown>
): void {
	if (!shouldInitBrowserPostHog()) return;
	posthog.capture(event, sanitizeAnalyticsProperties(properties));
}
