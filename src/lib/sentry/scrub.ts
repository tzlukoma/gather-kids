import type { ErrorEvent, EventHint } from '@sentry/core';

/**
 * Strip emails, obvious person-name fields, and request/response bodies
 * from Sentry events. Stack traces are left intact.
 *
 * Do not call Sentry.setUser with guardian email or child identifiers.
 * Sentry is not a store of family records.
 */

export const SENTRY_REDACTED = '[Filtered]';

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const NAME_KEY_RE =
	/^(firstname|first_name|first-name|lastname|last_name|last-name|fullname|full_name|full-name|childname|child_name|child-name|guardianname|guardian_name|guardian-name|parentname|parent_name|parent-name|displayname|display_name|display-name|givenname|given_name|familyname|family_name|preferredname|preferred_name|username)$/i;

const EMAIL_KEY_RE = /email/i;

const BODY_KEY_RE = /^(body|requestbody|request_body|responsebody|response_body|payload)$/i;

const TECHNICAL_CONTEXT_KEYS = new Set([
	'os',
	'browser',
	'device',
	'app',
	'culture',
	'gpu',
	'runtime',
	'engine',
	'cpu',
	'trace',
	'react',
]);

export type ScrubbableSentryEvent = {
	message?: string;
	extra?: Record<string, unknown>;
	tags?: Record<string, unknown>;
	user?: Record<string, unknown> | null;
	request?: {
		url?: string;
		method?: string;
		headers?: Record<string, string>;
		data?: unknown;
		cookies?: unknown;
		query_string?: unknown;
		env?: Record<string, string>;
	};
	contexts?: Record<string, unknown>;
	breadcrumbs?: unknown;
	exception?: {
		values?: Array<{
			type?: string;
			value?: string;
			stacktrace?: unknown;
		}>;
	};
	[key: string]: unknown;
};

function redactEmailsInString(value: string): string {
	return value.replace(EMAIL_RE, SENTRY_REDACTED);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function scrubValue(value: unknown, parentKey?: string): unknown {
	if (typeof value === 'string') {
		return redactEmailsInString(value);
	}

	if (Array.isArray(value)) {
		return value.map((item) => scrubValue(item, parentKey));
	}

	if (!isPlainObject(value)) {
		return value;
	}

	const next: Record<string, unknown> = {};
	for (const [key, child] of Object.entries(value)) {
		if (NAME_KEY_RE.test(key) || EMAIL_KEY_RE.test(key) || BODY_KEY_RE.test(key)) {
			continue;
		}
		if (parentKey === 'user' && key.toLowerCase() === 'name') {
			continue;
		}
		next[key] = scrubValue(child, key);
	}
	return next;
}

function scrubRequest(request: NonNullable<ScrubbableSentryEvent['request']>) {
	const next = { ...request };
	delete next.data;

	if (next.headers) {
		next.headers = scrubValue(next.headers, 'headers') as Record<string, string>;
	}
	if (next.query_string) {
		next.query_string = scrubValue(next.query_string, 'query_string');
	}
	if (next.cookies) {
		next.cookies = scrubValue(next.cookies, 'cookies');
	}
	if (next.env) {
		next.env = scrubValue(next.env, 'env') as Record<string, string>;
	}
	if (typeof next.url === 'string') {
		next.url = redactEmailsInString(next.url);
	}

	return next;
}

function scrubBreadcrumbs(breadcrumbs: unknown): unknown {
	if (Array.isArray(breadcrumbs)) {
		return breadcrumbs.map((crumb) => scrubValue(crumb, 'breadcrumb'));
	}

	if (isPlainObject(breadcrumbs) && Array.isArray(breadcrumbs.values)) {
		return {
			...breadcrumbs,
			values: breadcrumbs.values.map((crumb) => scrubValue(crumb, 'breadcrumb')),
		};
	}

	return breadcrumbs;
}

function scrubContexts(contexts: Record<string, unknown>): Record<string, unknown> {
	const next: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(contexts)) {
		if (key === 'response' && isPlainObject(value)) {
			const response = { ...value };
			delete response.body;
			delete response.data;
			next.response = scrubValue(response, 'response');
			continue;
		}

		if (TECHNICAL_CONTEXT_KEYS.has(key)) {
			next[key] = value;
			continue;
		}

		next[key] = scrubValue(value, key);
	}

	return next;
}

function scrubException(exception: NonNullable<ScrubbableSentryEvent['exception']>) {
	return {
		...exception,
		values: exception.values?.map((item) => ({
			...item,
			value: typeof item.value === 'string' ? redactEmailsInString(item.value) : item.value,
			// stacktrace is copied through untouched
		})),
	};
}

/**
 * Mutates a copy of the event: emails and obvious name fields are stripped,
 * request/response bodies are dropped, stack traces remain.
 */
export function scrubSentryEvent<T extends ScrubbableSentryEvent>(event: T): T {
	const next: ScrubbableSentryEvent = { ...event };

	if (typeof next.message === 'string') {
		next.message = redactEmailsInString(next.message);
	}

	if (next.extra) {
		next.extra = scrubValue(next.extra, 'extra') as Record<string, unknown>;
	}

	if (next.tags) {
		next.tags = scrubValue(next.tags, 'tags') as Record<string, unknown>;
	}

	if (next.user) {
		next.user = scrubValue(next.user, 'user') as Record<string, unknown>;
	}

	if (next.request) {
		next.request = scrubRequest(next.request);
	}

	if (next.contexts) {
		next.contexts = scrubContexts(next.contexts);
	}

	if (next.breadcrumbs) {
		next.breadcrumbs = scrubBreadcrumbs(next.breadcrumbs);
	}

	if (next.exception) {
		next.exception = scrubException(next.exception);
	}

	return next as T;
}

/** `Sentry.init({ beforeSend })` hook used by client, server, and edge. */
export function sentryBeforeSend(event: ErrorEvent, _hint?: EventHint): ErrorEvent {
	return scrubSentryEvent(event as unknown as ScrubbableSentryEvent) as unknown as ErrorEvent;
}
