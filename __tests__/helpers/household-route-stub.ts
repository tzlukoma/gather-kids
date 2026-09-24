/**
 * Stand in for `POST /api/household` in tests that drive
 * `registerHouseholdCanonical`.
 *
 * Registration creates the household through the server rather than the
 * adapter, so the browser never chooses the id (#496). Tests that exercise
 * registration have no server, and what they are actually about — eligibility,
 * custom fields, which id related rows use — is downstream of how the household
 * row gets made.
 *
 * Returns handles on what the route was asked for, so a test can assert on the
 * request rather than on `db.createHousehold`, which registration no longer
 * calls.
 */
export function stubHouseholdRoute() {
	const createdHouseholdIds: string[] = [];
	const requests: Array<Record<string, unknown>> = [];
	// Bible Bee enrollment is also decided on the server (#527).
	const bibleBeeEnrollRequests: Array<Record<string, unknown>> = [];

	beforeEach(() => {
		createdHouseholdIds.length = 0;
		requests.length = 0;
		bibleBeeEnrollRequests.length = 0;
		global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			if (String(input) === '/api/bible-bee/enroll') {
				bibleBeeEnrollRequests.push(JSON.parse(String(init?.body ?? '{}')));
				return {
					ok: true,
					status: 200,
					json: async () => ({ enrolled: true }),
				} as Response;
			}
			if (String(input).startsWith('/api/household')) {
				requests.push(JSON.parse(String(init?.body ?? '{}')));
				const householdId = `server-made-${createdHouseholdIds.length + 1}`;
				createdHouseholdIds.push(householdId);
				return {
					ok: true,
					status: 200,
					json: async () => ({ householdId, created: true }),
				} as Response;
			}
			throw new Error(`unexpected fetch to ${String(input)}`);
		}) as unknown as typeof fetch;
	});

	return { createdHouseholdIds, requests, bibleBeeEnrollRequests };
}
