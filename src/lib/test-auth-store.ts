interface TestAuthUser {
	email: string;
	password: string;
	verified: boolean;
}

const testUsers = new Map<string, TestAuthUser>();

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function registerTestUser(email: string, password: string): void {
	testUsers.set(normalizeEmail(email), {
		email: normalizeEmail(email),
		password,
		verified: false,
	});
}

export function verifyTestUser(email: string): boolean {
	const user = testUsers.get(normalizeEmail(email));
	if (!user) {
		return false;
	}

	user.verified = true;
	testUsers.set(normalizeEmail(email), user);
	return true;
}

export function getTestUser(email: string): TestAuthUser | undefined {
	return testUsers.get(normalizeEmail(email));
}

export function resendTestUserVerification(email: string): boolean {
	return testUsers.has(normalizeEmail(email));
}
