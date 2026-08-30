import { SENTRY_REDACTED, scrubSentryEvent, sentryBeforeSend } from './scrub';

const SYNTHETIC_EMAIL = 'guardian.fixture@example.test';
const SYNTHETIC_STACK_FRAMES = [
	{
		filename: 'app:///src/lib/sentry/scrub.ts',
		function: 'scrubSentryEvent',
		lineno: 42,
		colno: 3,
	},
	{
		filename: 'app:///src/app/api/register/route.ts',
		function: 'POST',
		lineno: 18,
		colno: 12,
	},
];

describe('scrubSentryEvent', () => {
	it('strips emails from extra and request headers', () => {
		const event = scrubSentryEvent({
			extra: {
				note: `contact ${SYNTHETIC_EMAIL} about the fixture household`,
				guardianEmail: SYNTHETIC_EMAIL,
			},
			request: {
				url: 'https://example.test/register',
				headers: {
					'x-forwarded-for': '203.0.113.10',
					'x-user-email': SYNTHETIC_EMAIL,
					referer: `https://example.test/login?email=${SYNTHETIC_EMAIL}`,
				},
			},
		});

		expect(event.extra?.note).toBe(`contact ${SENTRY_REDACTED} about the fixture household`);
		expect(event.extra).not.toHaveProperty('guardianEmail');
		expect(event.request?.headers?.['x-user-email']).toBeUndefined();
		expect(event.request?.headers?.referer).toBe(
			`https://example.test/login?email=${SENTRY_REDACTED}`
		);
		expect(event.request?.headers?.['x-forwarded-for']).toBe('203.0.113.10');
	});

	it('drops obvious name fields and request/response bodies', () => {
		const event = scrubSentryEvent({
			user: {
				id: 'user-fixture-001',
				email: SYNTHETIC_EMAIL,
				username: 'fixture-guardian',
				name: 'Jane Fixture',
				firstName: 'Jane',
				last_name: 'Fixture',
			},
			extra: {
				childName: 'Alex Fixture',
				full_name: 'Alex Fixture',
				ministry: 'Sunday School',
			},
			request: {
				method: 'POST',
				url: 'https://example.test/api/register',
				data: {
					guardians: [{ email: SYNTHETIC_EMAIL, first_name: 'Jane' }],
					children: [{ first_name: 'Alex' }],
				},
			},
			contexts: {
				response: {
					status_code: 500,
					body: { household: { name: 'Fixture Household' } },
				},
				browser: { name: 'Chrome', version: '120.0' },
			},
		});

		expect(event.user).toEqual({ id: 'user-fixture-001' });
		expect(event.extra).toEqual({ ministry: 'Sunday School' });
		expect(event.request).not.toHaveProperty('data');
		expect(event.request?.method).toBe('POST');
		expect(event.contexts?.response).toEqual({ status_code: 500 });
		expect(event.contexts?.browser).toEqual({ name: 'Chrome', version: '120.0' });
	});

	it('keeps stack traces and exception type', () => {
		const event = sentryBeforeSend({
			type: undefined,
			message: `Unhandled error for ${SYNTHETIC_EMAIL}`,
			exception: {
				values: [
					{
						type: 'TypeError',
						value: `Cannot read properties of undefined (${SYNTHETIC_EMAIL})`,
						stacktrace: { frames: SYNTHETIC_STACK_FRAMES },
					},
				],
			},
		});

		expect(event.exception?.values?.[0]?.type).toBe('TypeError');
		expect(event.exception?.values?.[0]?.stacktrace).toEqual({
			frames: SYNTHETIC_STACK_FRAMES,
		});
		expect(event.exception?.values?.[0]?.value).toBe(
			`Cannot read properties of undefined (${SENTRY_REDACTED})`
		);
		expect(event.message).toBe(`Unhandled error for ${SENTRY_REDACTED}`);
	});
});
