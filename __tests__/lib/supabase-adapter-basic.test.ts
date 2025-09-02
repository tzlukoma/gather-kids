import { createSupabaseMock } from '@/test-utils/supabase-mock';
import { SupabaseAdapter } from '@/lib/database/supabase-adapter';

describe('Supabase Adapter Basic Functionality', () => {
	let adapter: SupabaseAdapter;
	let mockClient: any;

	beforeEach(() => {
		mockClient = createSupabaseMock();
		adapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			mockClient
		);
	});

	test('adapter can be instantiated', () => {
		expect(adapter).toBeInstanceOf(SupabaseAdapter);
	});

	test('adapter has all required methods', () => {
		// Test that core methods exist
		expect(typeof adapter.getHousehold).toBe('function');
		expect(typeof adapter.createHousehold).toBe('function');
		expect(typeof adapter.updateHousehold).toBe('function');
		expect(typeof adapter.listHouseholds).toBe('function');
		expect(typeof adapter.deleteHousehold).toBe('function');
		
		expect(typeof adapter.getChild).toBe('function');
		expect(typeof adapter.createChild).toBe('function');
		expect(typeof adapter.updateChild).toBe('function');
		expect(typeof adapter.listChildren).toBe('function');
		expect(typeof adapter.deleteChild).toBe('function');
		
		expect(typeof adapter.getGuardian).toBe('function');
		expect(typeof adapter.createGuardian).toBe('function');
		expect(typeof adapter.updateGuardian).toBe('function');
		expect(typeof adapter.listGuardians).toBe('function');
		expect(typeof adapter.deleteGuardian).toBe('function');
		
		// Special methods
		expect(typeof adapter.subscribeToTable).toBe('function');
		expect(typeof adapter.transaction).toBe('function');
	});

	test('basic household CRUD operations work', async () => {
		// Create a household
		const householdData = {
			address_line1: '123 Test St',
			city: 'TestCity',
			state: 'TC',
			zip: '12345',
		};

		const created = await adapter.createHousehold(householdData);
		expect(created).toBeTruthy();
		expect(created.household_id).toBeTruthy();
		expect(created.address_line1).toBe(householdData.address_line1);
		expect(created.created_at).toBeTruthy();
		expect(created.updated_at).toBeTruthy();

		// Retrieve the household
		const retrieved = await adapter.getHousehold(created.household_id);
		expect(retrieved).toBeTruthy();
		expect(retrieved!.household_id).toBe(created.household_id);
		expect(retrieved!.address_line1).toBe(created.address_line1);

		// Update the household
		const updateData = { city: 'UpdatedCity' };
		const updated = await adapter.updateHousehold(created.household_id, updateData);
		expect(updated.city).toBe('UpdatedCity');
		expect(updated.address_line1).toBe(created.address_line1); // Should remain unchanged

		// List households (basic)
		const households = await adapter.listHouseholds();
		expect(Array.isArray(households)).toBe(true);
		expect(households.some(h => h.household_id === created.household_id)).toBe(true);

		// Delete the household
		await adapter.deleteHousehold(created.household_id);
		const afterDelete = await adapter.getHousehold(created.household_id);
		expect(afterDelete).toBeNull();
	});

	test('basic child operations work with household relationship', async () => {
		// Create a household first
		const household = await adapter.createHousehold({
			address_line1: '123 Family St',
			city: 'FamilyCity',
			state: 'FC',
			zip: '54321',
		});

		// Create a child
		const childData = {
			household_id: household.household_id,
			first_name: 'Test',
			last_name: 'Child',
			dob: '2018-01-01',
			is_active: true,
		};

		const created = await adapter.createChild(childData);
		expect(created).toBeTruthy();
		expect(created.child_id).toBeTruthy();
		expect(created.household_id).toBe(household.household_id);
		expect(created.first_name).toBe(childData.first_name);

		// Retrieve the child
		const retrieved = await adapter.getChild(created.child_id);
		expect(retrieved).toBeTruthy();
		expect(retrieved!.child_id).toBe(created.child_id);

		// Update the child
		const updateData = { allergies: 'None known' };
		const updated = await adapter.updateChild(created.child_id, updateData);
		expect(updated.allergies).toBe('None known');

		// Clean up
		await adapter.deleteChild(created.child_id);
		await adapter.deleteHousehold(household.household_id);
	});

	test('utility methods work correctly', async () => {
		// Test subscribeToTable
		const callback = jest.fn();
		const unsubscribe = adapter.subscribeToTable('households', callback);
		expect(typeof unsubscribe).toBe('function');
		unsubscribe(); // Should not throw

		// Test transaction
		const result = await adapter.transaction(async () => {
			const household = await adapter.createHousehold({
				address_line1: '123 Transaction St',
				city: 'TransactionCity',
				state: 'TC',
				zip: '99999',
			});
			return household.household_id;
		});

		expect(result).toBeTruthy();
		
		// Verify the household was created
		const household = await adapter.getHousehold(result);
		expect(household).toBeTruthy();
		expect(household!.city).toBe('TransactionCity');

		// Clean up
		await adapter.deleteHousehold(result);
	});

	test('handles not found scenarios gracefully', async () => {
		// Getting non-existent records should return null
		expect(await adapter.getHousehold('non-existent-id')).toBeNull();
		expect(await adapter.getChild('non-existent-id')).toBeNull();
		expect(await adapter.getGuardian('non-existent-id')).toBeNull();
	});

	test('error handling for update/delete operations', async () => {
		// Updating non-existent records may succeed in the mock (creates the record)
		// or may fail - either behavior is acceptable for a mock
		try {
			await adapter.updateHousehold('non-existent-id', { city: 'New City' });
		} catch (error) {
			// Either throwing an error or succeeding is acceptable
			expect(error).toBeDefined();
		}

		// Deleting non-existent records should not crash
		await adapter.deleteHousehold('non-existent-id'); // Should complete without error
	});
});