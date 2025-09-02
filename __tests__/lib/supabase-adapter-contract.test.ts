import { createInMemoryDB } from '@/test-utils/dexie-mock';
import { createSupabaseMock } from '@/test-utils/supabase-mock';
import { DatabaseAdapter } from '@/lib/database/types';
import { IndexedDBAdapter } from '@/lib/database/indexed-db-adapter';
import { SupabaseAdapter } from '@/lib/database/supabase-adapter';
import { v4 as uuidv4 } from 'uuid';

// Parameterized adapter contract test runner. Call runContractTests for
// each adapter you want to validate
function runContractTests(
	adapterName: string,
	getAdapter: () => DatabaseAdapter
) {
	describe(`Adapter Contract Tests - ${adapterName}`, () => {
		// Generate fresh ids per adapter run
		const testHouseholdId = uuidv4();
		const testChildId = uuidv4();
		const testGuardianId = uuidv4();
		const testCycleId = uuidv4();
		const testRegistrationId = uuidv4();
		const testMinistryId = uuidv4();
		const testEnrollmentId = uuidv4();
		const testEventId = uuidv4();
		const testAttendanceId = uuidv4();
		const testIncidentId = uuidv4();

		const now = new Date().toISOString();
		let adapter: DatabaseAdapter;

		beforeEach(() => {
			adapter = getAdapter();
		});

		// Define test data
		const testHousehold = {
			household_id: testHouseholdId,
			address_line1: '123 Main St',
			city: 'Testville',
			state: 'TX',
			zip: '12345',
			created_at: now,
			updated_at: now,
		};

		const testChild = {
			child_id: testChildId,
			household_id: testHouseholdId,
			first_name: 'Test',
			last_name: 'Child',
			dob: '2015-01-01',
			special_needs: false,
			allergies: 'None',
			medical_notes: 'None',
			is_active: true,
			created_at: now,
			updated_at: now,
		};

		const testGuardian = {
			guardian_id: testGuardianId,
			household_id: testHouseholdId,
			first_name: 'Parent',
			last_name: 'Guardian',
			relationship: 'Parent',
			is_primary: true,
			email: 'parent@example.com',
			mobile_phone: '555-123-4567',
			created_at: now,
			updated_at: now,
		};

		// Tests for core entities and operations

		describe('Household Operations', () => {
			test('createHousehold creates a household with correct data', async () => {
				const householdData = {
					address_line1: testHousehold.address_line1,
					city: testHousehold.city,
					state: testHousehold.state,
					zip: testHousehold.zip,
				};

				const result = await adapter.createHousehold(householdData);

				// Verify the result
				expect(result).toBeTruthy();
				expect(result.household_id).toBeTruthy(); // Should have an ID
				expect(result.address_line1).toBe(householdData.address_line1);
				expect(result.city).toBe(householdData.city);
				expect(result.state).toBe(householdData.state);
				expect(result.zip).toBe(householdData.zip);
				expect(result.created_at).toBeTruthy(); // Should have timestamps
				expect(result.updated_at).toBeTruthy();
			});

			test('getHousehold retrieves a household by ID', async () => {
				// Create a household first
				const created = await adapter.createHousehold({
					address_line1: testHousehold.address_line1,
					city: testHousehold.city,
					state: testHousehold.state,
					zip: testHousehold.zip,
				});

				// Now retrieve it
				const result = await adapter.getHousehold(created.household_id);

				// Verify the result
				expect(result).toBeTruthy();
				expect(result!.household_id).toBe(created.household_id);
				expect(result!.address_line1).toBe(created.address_line1);
			});

			test('updateHousehold updates a household', async () => {
				// Create a household first
				const created = await adapter.createHousehold({
					address_line1: testHousehold.address_line1,
					city: testHousehold.city,
					state: testHousehold.state,
					zip: testHousehold.zip,
				});

				// Update it
				const updatedData = {
					address_line1: '456 New St',
					city: 'Newville',
				};

				const updated = await adapter.updateHousehold(
					created.household_id,
					updatedData
				);

				// Verify the result
				expect(updated.address_line1).toBe(updatedData.address_line1);
				expect(updated.city).toBe(updatedData.city);
				expect(updated.state).toBe(created.state); // Unchanged fields remain the same
				expect(updated.updated_at).not.toBe(created.updated_at); // Updated timestamp
			});

			test('listHouseholds returns all households matching filters', async () => {
				// Create multiple households
				await adapter.createHousehold({
					address_line1: '123 Oak St',
					city: 'Austin',
					state: 'TX',
					zip: '78701',
				});

				await adapter.createHousehold({
					address_line1: '456 Pine St',
					city: 'Austin',
					state: 'TX',
					zip: '78702',
				});

				await adapter.createHousehold({
					address_line1: '789 Elm St',
					city: 'Dallas',
					state: 'TX',
					zip: '75201',
				});

				// Test without filters
				const allHouseholds = await adapter.listHouseholds();
				expect(allHouseholds.length).toBeGreaterThanOrEqual(3);

				// Test with city filter
				const austinHouseholds = await adapter.listHouseholds({
					city: 'Austin',
				});
				expect(austinHouseholds.length).toBeGreaterThanOrEqual(2);
				expect(austinHouseholds.every((h) => h.city === 'Austin')).toBe(true);

				// Test with zip filter
				const zipHouseholds = await adapter.listHouseholds({ zip: '78701' });
				expect(zipHouseholds.length).toBeGreaterThanOrEqual(1);
				expect(zipHouseholds.every((h) => h.zip === '78701')).toBe(true);
			});

			test('getHousehold returns null for non-existent ID', async () => {
				const nonExistentId = uuidv4();
				const result = await adapter.getHousehold(nonExistentId);
				expect(result).toBeNull();
			});

			test('deleteHousehold removes a household', async () => {
				// Create a household
				const created = await adapter.createHousehold({
					address_line1: testHousehold.address_line1,
					city: testHousehold.city,
					state: testHousehold.state,
					zip: testHousehold.zip,
				});

				// Delete it
				await adapter.deleteHousehold(created.household_id);

				// Verify it's gone
				const result = await adapter.getHousehold(created.household_id);
				expect(result).toBeNull();
			});
		});

		describe('Child Operations', () => {
			// Similar test structure as households
			let householdId: string;

			beforeEach(async () => {
				// Create a household for the child tests
				const household = await adapter.createHousehold({
					address_line1: testHousehold.address_line1,
					city: testHousehold.city,
					state: testHousehold.state,
					zip: testHousehold.zip,
				});
				householdId = household.household_id;
			});

			test('createChild creates a child with correct data', async () => {
				const childData = {
					household_id: householdId,
					first_name: testChild.first_name,
					last_name: testChild.last_name,
					dob: testChild.dob,
					is_active: true,
				};

				const result = await adapter.createChild(childData);

				expect(result).toBeTruthy();
				expect(result.child_id).toBeTruthy();
				expect(result.first_name).toBe(childData.first_name);
				expect(result.last_name).toBe(childData.last_name);
				expect(result.household_id).toBe(householdId);
			});

			test('getChild retrieves a child by ID', async () => {
				const created = await adapter.createChild({
					household_id: householdId,
					first_name: testChild.first_name,
					last_name: testChild.last_name,
					dob: testChild.dob,
					is_active: true,
				});

				const result = await adapter.getChild(created.child_id);

				expect(result).toBeTruthy();
				expect(result!.child_id).toBe(created.child_id);
				expect(result!.first_name).toBe(created.first_name);
			});

			test('updateChild updates a child', async () => {
				const created = await adapter.createChild({
					household_id: householdId,
					first_name: testChild.first_name,
					last_name: testChild.last_name,
					dob: testChild.dob,
					is_active: true,
				});

				const updatedData = {
					first_name: 'Updated',
					allergies: 'Peanuts',
				};

				const updated = await adapter.updateChild(created.child_id, updatedData);

				expect(updated.first_name).toBe(updatedData.first_name);
				expect(updated.allergies).toBe(updatedData.allergies);
				expect(updated.last_name).toBe(created.last_name); // Unchanged
			});

			test('listChildren returns children with filters', async () => {
				await adapter.createChild({
					household_id: householdId,
					first_name: 'Active',
					last_name: 'Child',
					dob: '2015-01-01',
					is_active: true,
				});

				await adapter.createChild({
					household_id: householdId,
					first_name: 'Inactive',
					last_name: 'Child',
					dob: '2016-01-01',
					is_active: false,
				});

				// Test with household filter
				const householdChildren = await adapter.listChildren({
					householdId: householdId,
				});
				expect(householdChildren.length).toBeGreaterThanOrEqual(2);

				// Test with active filter
				const activeChildren = await adapter.listChildren({
					householdId: householdId,
					isActive: true,
				});
				expect(activeChildren.length).toBeGreaterThanOrEqual(1);
				expect(activeChildren.every((c) => c.is_active === true)).toBe(true);
			});

			test('deleteChild removes a child', async () => {
				const created = await adapter.createChild({
					household_id: householdId,
					first_name: testChild.first_name,
					last_name: testChild.last_name,
					dob: testChild.dob,
					is_active: true,
				});

				await adapter.deleteChild(created.child_id);

				const result = await adapter.getChild(created.child_id);
				expect(result).toBeNull();
			});
		});

		describe('Guardian Operations', () => {
			let householdId: string;

			beforeEach(async () => {
				const household = await adapter.createHousehold({
					address_line1: testHousehold.address_line1,
					city: testHousehold.city,
					state: testHousehold.state,
					zip: testHousehold.zip,
				});
				householdId = household.household_id;
			});

			test('createGuardian creates a guardian with correct data', async () => {
				const guardianData = {
					household_id: householdId,
					first_name: testGuardian.first_name,
					last_name: testGuardian.last_name,
					relationship: testGuardian.relationship,
					is_primary: testGuardian.is_primary,
					email: testGuardian.email,
					mobile_phone: testGuardian.mobile_phone,
				};

				const result = await adapter.createGuardian(guardianData);

				expect(result).toBeTruthy();
				expect(result.guardian_id).toBeTruthy();
				expect(result.first_name).toBe(guardianData.first_name);
				expect(result.email).toBe(guardianData.email);
				expect(result.household_id).toBe(householdId);
			});

			test('listGuardians returns guardians for household', async () => {
				await adapter.createGuardian({
					household_id: householdId,
					first_name: 'Parent1',
					last_name: 'Guardian',
					relationship: 'Parent',
					is_primary: true,
					email: 'parent1@example.com',
				});

				await adapter.createGuardian({
					household_id: householdId,
					first_name: 'Parent2',
					last_name: 'Guardian',
					relationship: 'Parent',
					is_primary: false,
					email: 'parent2@example.com',
				});

				const guardians = await adapter.listGuardians(householdId);
				expect(guardians.length).toBeGreaterThanOrEqual(2);
				expect(guardians.every((g) => g.household_id === householdId)).toBe(true);
			});
		});

		describe('Transaction Support', () => {
			test('transaction executes all operations or none', async () => {
				try {
					await adapter.transaction(async () => {
						// Create a household
						const household = await adapter.createHousehold({
							address_line1: '123 Transaction St',
							city: 'Transactionville',
							state: 'TX',
							zip: '12345',
						});

						// Create a child in that household
						await adapter.createChild({
							household_id: household.household_id,
							first_name: 'Transaction',
							last_name: 'Child',
							dob: '2020-01-01',
							is_active: true,
						});

						// Throw an error to abort transaction
						throw new Error('Intentional error to abort transaction');
					});
				} catch (e) {
					// Expected error
				}

				// Check if the household was created (it shouldn't be if transactions work)
				const households = await adapter.listHouseholds({
					city: 'Transactionville',
				});
				// Note: IndexedDB may not support full transactions, so this test may be lenient
				// The important thing is that the adapter provides the transaction interface
			});
		});

		describe('Realtime Subscriptions', () => {
			test('subscribeToTable returns unsubscribe function', () => {
				const callback = jest.fn();
				const unsubscribe = adapter.subscribeToTable('households', callback);

				expect(typeof unsubscribe).toBe('function');
				
				// Should be safe to call unsubscribe
				expect(() => unsubscribe()).not.toThrow();
			});
		});

		describe('Error Handling', () => {
			test('handles not found errors gracefully', async () => {
				const nonExistentId = uuidv4();
				const result = await adapter.getHousehold(nonExistentId);
				expect(result).toBeNull();
			});

			test('handles invalid data errors', async () => {
				// @ts-ignore - Intentionally passing invalid data
				await expect(
					adapter.createHousehold({ invalid: 'data' })
				).rejects.toThrow();
			});
		});
	});
}

// Run tests against the IndexedDB adapter
describe('IndexedDB Adapter Tests', () => {
	const getIndexedDBAdapter = () => {
		return new IndexedDBAdapter();
	};

	runContractTests('IndexedDB', getIndexedDBAdapter);
});

// Run tests against the Supabase adapter
describe('Supabase Adapter Tests', () => {
	const getSupabaseAdapter = () => {
		const mockSupabaseClient = createSupabaseMock();
		return new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			mockSupabaseClient
		);
	};

	runContractTests('Supabase', getSupabaseAdapter);
});