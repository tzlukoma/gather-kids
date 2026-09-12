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

/**
 * Next.js only inlines *static* `process.env.NEXT_PUBLIC_*` member access into
 * the browser bundle. Passing `process.env` as an object (or destructuring it)
 * leaves those keys undefined on Preview/Production even when Vercel has them.
 *
 * Do not read `process.env.CI` here: Vercel sets `CI=true` at build time, and
 * a static read would bake that into the client and permanently disable PostHog.
 */
function readBrowserAnalyticsEnv(override?: Env): Env {
	if (override) return override;
	return {
		NODE_ENV: process.env.NODE_ENV,
		NEXT_PUBLIC_DEPLOY_ENV: process.env.NEXT_PUBLIC_DEPLOY_ENV,
		VERCEL_ENV: process.env.VERCEL_ENV,
		NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN:
			process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
		NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
	};
}

export function getAnalyticsDeployEnv(env?: Env): string {
	const source = readBrowserAnalyticsEnv(env);
	return (
		envValue(source.NEXT_PUBLIC_DEPLOY_ENV) ||
		envValue(source.VERCEL_ENV) ||
		'development'
	);
}

const LOCAL_ANALYTICS_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isLocalAnalyticsHostname(hostname: string | undefined): boolean {
	if (!hostname) return false;
	return LOCAL_ANALYTICS_HOSTNAMES.has(hostname);
}

function runtimeAnalyticsHostname(): string | undefined {
	if (typeof window === 'undefined') return undefined;
	return window.location.hostname;
}

export function shouldInitBrowserPostHog(
	env?: Env,
	hostname?: string
): boolean {
	const source = readBrowserAnalyticsEnv(env);
	if (
		source.NODE_ENV === 'test' ||
		source.NODE_ENV === 'development' ||
		source.CI === 'true'
	) {
		return false;
	}

	const resolvedHostname =
		hostname ?? (env ? undefined : runtimeAnalyticsHostname());
	if (isLocalAnalyticsHostname(resolvedHostname)) return false;

	const deployEnv = getAnalyticsDeployEnv(source);
	if (deployEnv !== 'uat' && deployEnv !== 'production') return false;

	return Boolean(
		envValue(source.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) &&
			envValue(source.NEXT_PUBLIC_POSTHOG_HOST)
	);
}

export function buildAnalyticsDistinctId(userId: string, env?: Env): string {
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
