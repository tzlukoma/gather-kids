/**
 * @jest-environment node
 */

import {
	TEST_AUTH_CODE_MAX_AGE_MS,
	decodeTestAuthCode,
	encodeTestAuthCode,
} from '@/lib/test-auth-code';

describe('test auth codes', () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it('round-trips a valid payload', () => {
		const payload = {
			email: 'test@example.com',
			type: 'email_verify' as const,
			timestamp: Date.now(),
		};

		expect(decodeTestAuthCode(encodeTestAuthCode(payload))).toEqual(payload);
	});

	it('rejects expired codes', () => {
		const payload = {
			email: 'test@example.com',
			type: 'magic_link' as const,
			timestamp: Date.now(),
		};
		const code = encodeTestAuthCode(payload);

		jest.useFakeTimers();
		jest.setSystemTime(payload.timestamp + TEST_AUTH_CODE_MAX_AGE_MS + 1);

		expect(() => decodeTestAuthCode(code)).toThrow('Test auth code has expired');
	});
});
