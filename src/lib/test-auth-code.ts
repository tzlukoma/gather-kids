export interface TestAuthCodePayload {
	email: string;
	type: 'magic_link' | 'email_verify';
	timestamp: number;
}

/** Dummy/MailHog test codes expire after one hour, matching the email copy. */
export const TEST_AUTH_CODE_MAX_AGE_MS = 60 * 60 * 1000;

export function encodeTestAuthCode(payload: TestAuthCodePayload): string {
	return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function assertValidPayload(decoded: TestAuthCodePayload): TestAuthCodePayload {
	if (!decoded.email || !decoded.type) {
		throw new Error('Invalid test auth code payload');
	}

	if (
		typeof decoded.timestamp !== 'number' ||
		Date.now() - decoded.timestamp > TEST_AUTH_CODE_MAX_AGE_MS
	) {
		throw new Error('Test auth code has expired');
	}

	return decoded;
}

export function decodeTestAuthCode(code: string): TestAuthCodePayload {
	const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
	const paddedBase64 =
		base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
	const decodedString = Buffer.from(paddedBase64, 'base64').toString('utf8');
	return assertValidPayload(JSON.parse(decodedString) as TestAuthCodePayload);
}

/** Browser-safe decode for auth callback client code. */
export function decodeTestAuthCodeInBrowser(code: string): TestAuthCodePayload {
	const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
	const paddedBase64 =
		base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
	const decodedString = atob(paddedBase64);
	return assertValidPayload(JSON.parse(decodedString) as TestAuthCodePayload);
}
